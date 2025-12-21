import { useState } from 'react';
import './PdfPreviewer.css';
import { ALL_SAMPLES } from '../data/samplePdfs';

/**
 * PdfPreviewer Component
 * 
 * A React component that allows users to paste Base64 PDF strings and preview them
 * using the "Proxy Tab" pattern for mobile browser compatibility.
 * 
 * Features:
 * - Handles both raw Base64 and Data URI format
 * - Opens PDF in new tab to bypass popup blockers
 * - Converts Base64 to Blob for memory efficiency (bypasses 2MB Data URI limit)
 * - Automatic memory cleanup after 60 seconds
 * - Error handling with user feedback
 */
const PdfPreviewer = () => {
  const [base64Input, setBase64Input] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handles the PDF preview process using the Proxy Tab pattern
   */
  const handlePreviewReport = async () => {
    // Validate input
    if (!base64Input.trim()) {
      alert('Error: Please paste a Base64 PDF string into the textarea.');
      return;
    }

    setIsProcessing(true);

    // Step 1: Immediately open a new tab (must happen in user-initiated event)
    const proxyTab = window.open('about:blank', '_blank');
    
    if (!proxyTab) {
      alert('Error: Unable to open new tab. Please check your popup blocker settings.');
      setIsProcessing(false);
      return;
    }

    // Add loading message to proxy tab
    proxyTab.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading PDF...</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              background: #f5f5f5;
            }
            .loader {
              text-align: center;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <p>Loading PDF Report...</p>
          </div>
        </body>
      </html>
    `);

    try {
      // Step 2: Simulate API delay (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Process the Base64 string
      let base64Data = base64Input.trim();

      // Strip Data URI prefix if present
      const dataUriPrefix = 'data:application/pdf;base64,';
      if (base64Data.startsWith(dataUriPrefix)) {
        base64Data = base64Data.substring(dataUriPrefix.length);
      } else if (base64Data.startsWith('data:')) {
        // Handle other data URI formats
        const commaIndex = base64Data.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = base64Data.substring(commaIndex + 1);
        }
      }

      // Validate Base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        throw new Error('Invalid Base64 format. Please check your input.');
      }

      // Step 4: Convert Base64 to Blob using fetch (2025 best practice)
      const dataUri = `data:application/pdf;base64,${base64Data}`;
      const response = await fetch(dataUri);
      
      if (!response.ok) {
        throw new Error('Failed to process PDF data.');
      }

      const blob = await response.blob();

      // Verify it's a valid PDF blob
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty. Please check your Base64 data.');
      }

      // Step 5: Create Blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Step 6: Render PDF using embed tag (Chrome Android compatible)
      // Clear the loading content and inject the PDF viewer
      proxyTab.document.open();
      proxyTab.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PDF Preview</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              embed {
                width: 100%;
                height: 100%;
                border: none;
              }
            </style>
          </head>
          <body>
            <embed src="${blobUrl}" type="application/pdf" />
          </body>
        </html>
      `);
      proxyTab.document.close();

      // Step 7: Automatic cleanup after 60 seconds
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        console.log('Blob URL revoked for memory cleanup');
      }, 60000);

      setIsProcessing(false);

    } catch (error) {
      // Close proxy tab on error
      proxyTab.close();
      
      // Show error message
      alert(`Error: ${error.message}`);
      
      console.error('PDF Preview Error:', error);
      setIsProcessing(false);
    }
  };

  /**
   * Loads a sample PDF into the textarea
   */
  const loadSample = (samplePdf) => {
    setBase64Input(samplePdf.base64);
  };

  return (
    <div className="pdf-previewer">
      <div className="pdf-previewer-header">
        <h2>📄 PDF Previewer</h2>
        <p className="subtitle">Paste your Base64 PDF string below to preview</p>
      </div>

      <div className="pdf-previewer-content">
        <div className="samples-section">
          <h3 className="samples-title">📚 Try Sample PDFs</h3>
          <div className="samples-buttons">
            {ALL_SAMPLES.map((sample, index) => (
              <button
                key={index}
                className="sample-button"
                onClick={() => loadSample(sample)}
                disabled={isProcessing}
                title={sample.description}
              >
                <span className="sample-icon">📄</span>
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <textarea
          className="base64-input"
          value={base64Input}
          onChange={(e) => setBase64Input(e.target.value)}
          placeholder="Paste your Base64 PDF string here...&#10;&#10;Supports both formats:&#10;• Raw Base64: JVBERi0xLjQKJeLjz9MK...&#10;• Data URI: data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK..."
          rows={12}
          disabled={isProcessing}
        />

        <button
          className="preview-button"
          onClick={handlePreviewReport}
          disabled={isProcessing || !base64Input.trim()}
        >
          {isProcessing ? (
            <>
              <span className="button-spinner"></span>
              Processing...
            </>
          ) : (
            <>
              <span className="button-icon">🔍</span>
              Preview Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PdfPreviewer;
