Import-Module PnP.PowerShell

# =========================
# 🔧 CONFIGURATION
# =========================

# File paths
$inputCsv  = "/Users/username/Documents/Input.csv"
$outputCsv = "/Users/username/Documents/output.csv"
$scriptDirectory = if ($PSScriptRoot) {
    $PSScriptRoot
}
elseif ($PSCommandPath) {
    Split-Path -Parent $PSCommandPath
}
else {
    (Get-Location).Path
}

$logFile    = Join-Path -Path $scriptDirectory -ChildPath "script-errors.txt"
$statusFile = Join-Path -Path $scriptDirectory -ChildPath "script-status.txt"

function Write-ErrorLog {
    param(
        [string]$Message,
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $details = if ($ErrorRecord) {
        $ErrorRecord | Out-String
    }
    else {
        ""
    }

    try {
        Add-Content -Path $logFile -Value "[$timestamp] $Message`n$details" -ErrorAction Stop
    }
    catch {
        # Keep logging failures from affecting the main script flow.
    }
}

function Write-StatusLog {
    param(
        [string]$Level,
        [string]$Status,
        [string]$SiteUrl,
        [string]$LibraryName = "",
        [string]$Message = ""
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $parts = @(
        "[$timestamp]",
        "Level=$Level",
        "Status=$Status",
        "SiteUrl=$SiteUrl"
    )

    if ($LibraryName) {
        $parts += "LibraryName=$LibraryName"
    }

    if ($Message) {
        $parts += "Message=$Message"
    }

    try {
        Add-Content -Path $statusFile -Value ($parts -join " | ") -ErrorAction Stop
    }
    catch {
        # Keep logging failures from affecting the main script flow.
    }
}

# Entra App ID
$ENTRAID_APP_ID = "00000000-0000-0000-0000-000000000000" # <-- UPDATE THIS WITH YOUR ENTRA APP ID

# Input CSV column names
$csvSiteUrlColumn = "SiteUrl"
$csvLibraryColumn = "LibraryName"

# SharePoint field INTERNAL names (update if needed)
$fieldReadyForReview = "ReadyforReview"
$fieldApprovalStatus = "_ModerationStatus"

# Approval values
$approvalPending = 2
$approvalDraft   = 3

# Reusable CAML query (files only)
$query = @"
<View Scope='RecursiveAll'>
  <Query>
    <Where>
      <And>
        <Eq>
          <FieldRef Name='FSObjType'/>
          <Value Type='Integer'>0</Value>
        </Eq>
        <And>
          <Eq>
            <FieldRef Name='$fieldReadyForReview'/>
            <Value Type='Boolean'>1</Value>
          </Eq>
          <Or>
            <Eq>
              <FieldRef Name='$fieldApprovalStatus'/>
              <Value Type='ModStat'>$approvalPending</Value>
            </Eq>
            <Eq>
              <FieldRef Name='$fieldApprovalStatus'/>
              <Value Type='ModStat'>$approvalDraft</Value>
            </Eq>
          </Or>
        </And>
      </And>
    </Where>
  </Query>
</View>
"@

# Output column names
$outItemUrlColumn    = "ItemUrl"
$outLibraryUrlColumn = "LibraryUrl"
$outSiteColumn       = "SiteUrl"
$outLibraryColumn    = "LibraryName"

# =========================
# 🚀 SCRIPT START
# =========================

$results = @()
$rows = @()
$siteGroups = @()

try {
    Set-Content -Path $statusFile -Value "Status log started at $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")" -ErrorAction Stop
}
catch {
    # Keep logging failures from affecting the main script flow.
}

try {
    $rows = Import-Csv $inputCsv -ErrorAction Stop
}
catch {
    Write-Warning "❌ Error importing input CSV from $inputCsv : $_"
    Write-ErrorLog -Message "Error importing input CSV from $inputCsv" -ErrorRecord $_
    throw
}

$siteGroups = $rows | Group-Object -Property $csvSiteUrlColumn

foreach ($siteGroup in $siteGroups) {

    $siteUrl = $siteGroup.Name
    $connected = $false

    Write-Host "🔄 Connecting to $siteUrl"

    try {
        Connect-PnPOnline -Url $siteUrl -Interactive -ClientId $ENTRAID_APP_ID
        $connected = $true

        foreach ($row in $siteGroup.Group) {

            $libraryName = $row.$csvLibraryColumn
            $list = $null
            $fieldExists = $null
            $items = @()
            $libraryUrl = ""

            Write-Host "📚 Processing $siteUrl - $libraryName"

            try {
                $list = Get-PnPList -Identity $libraryName -ErrorAction Stop

                # 🔍 Validate "Ready for Review" field exists
                $fieldExists = Get-PnPField -List $libraryName | Where-Object {
                    $_.InternalName -eq $fieldReadyForReview
                }

                if (-not $fieldExists) {
                    Write-Warning "⚠️ Field '$fieldReadyForReview' not found in $libraryName (skipping)"
                    Write-StatusLog -Level "Library" -Status "Skipped" -SiteUrl $siteUrl -LibraryName $libraryName -Message "Field '$fieldReadyForReview' not found"
                    continue
                }

                $items = Get-PnPListItem -List $libraryName -Query $query -PageSize 1000
                $libraryUrl = "$siteUrl$($list.RootFolder.ServerRelativeUrl)"

                foreach ($item in $items) {

                    $fileRef = $null
                    $fullUrl = ""
                    $fileRef = $item["FileRef"]

                    if (-not $fileRef) { continue }

                    $fullUrl = "$siteUrl$fileRef"

                    $results += [PSCustomObject]@{
                        $outItemUrlColumn    = $fullUrl
                        $outLibraryUrlColumn = $libraryUrl
                        $outSiteColumn       = $siteUrl
                        $outLibraryColumn    = $libraryName
                    }
                }

                Write-StatusLog -Level "Library" -Status "Completed" -SiteUrl $siteUrl -LibraryName $libraryName -Message "Processed successfully. Matching files: $(@($items).Count)"
            }
            catch {
                Write-Warning "❌ Error processing $siteUrl - $libraryName : $_"
                Write-ErrorLog -Message "Error processing $siteUrl - $libraryName" -ErrorRecord $_
                Write-StatusLog -Level "Library" -Status "Error" -SiteUrl $siteUrl -LibraryName $libraryName -Message $_.Exception.Message
                continue
            }
        }

        Write-StatusLog -Level "Site" -Status "Completed" -SiteUrl $siteUrl -Message "Processed all libraries for this site"
    }
    catch {
        Write-Warning "❌ Error connecting to $siteUrl : $_"
        Write-ErrorLog -Message "Error connecting to $siteUrl" -ErrorRecord $_
        Write-StatusLog -Level "Site" -Status "Error" -SiteUrl $siteUrl -Message $_.Exception.Message
        continue
    }
    finally {
        if ($connected) {
            Disconnect-PnPOnline
        }
    }
}

# =========================
# 📤 EXPORT
# =========================

if ($results.Count -gt 0) {
    try {
        $results | Export-Csv -Path $outputCsv -NoTypeInformation
        Write-Host "✅ Done! Output saved to $outputCsv"
    }
    catch {
        Write-Warning "❌ Error exporting output to $outputCsv : $_"
        Write-ErrorLog -Message "Error exporting output to $outputCsv" -ErrorRecord $_
    }
}
else {
    Write-Warning "⚠️ No results found"
}
