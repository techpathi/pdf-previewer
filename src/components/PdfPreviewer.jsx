import { useState } from 'react';
import './PdfPreviewer.css';
import { ALL_SAMPLES } from '../data/samplePdfs';

/**
 * PdfPreviewer Component
 * 
 * A React component that allows users to paste Base64 PDF strings and preview them
 * in a new browser tab.
 * 
 * Features:
 * - Handles both raw Base64 and Data URI format
 * - Opens PDF in new tab using window.open() with the PDF blob URL
 * - Converts Base64 to Blob for memory efficiency
 * - Sample PDFs for quick testing
 * - Error handling with user feedback
 * - Automatic blob URL cleanup to prevent memory leaks
 */

/**
 * Converts a Base64 string to a PDF Blob
 * @param {string} base64Data - Base64 encoded PDF data (with or without data URI prefix)
 * @returns {Blob} PDF blob ready for preview
 * @throws {Error} If Base64 format is invalid or blob is empty
 */
const convertBase64ToPdfBlob = (base64Data) => {
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

  // Convert Base64 to binary (efficient method using Uint8Array.from)
  const binaryString = atob(base64Data);
  const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));

  // Create Blob from binary data
  const blob = new Blob([bytes], { type: 'application/pdf' });

  // Verify it's a valid PDF blob
  if (blob.size === 0) {
    throw new Error('Generated PDF is empty. Please check your Base64 data.');
  }

  return blob;
};

/**
 * Opens a PDF blob in a new browser tab by using the blob URL directly
 * @param {Blob} blob - PDF blob to open
 */
const openPdfInNewTab = (blob) => {
  // Create blob URL for the PDF
  const pdfBlobUrl = URL.createObjectURL(blob);

  // Open the PDF blob URL directly in a new tab
  window.open(pdfBlobUrl, '_blank');

  // Cleanup blob URL after a short delay to prevent memory leaks
  // Delay gives the browser time to load the PDF from the blob URL
  setTimeout(() => {
    try {
      URL.revokeObjectURL(pdfBlobUrl);
    } catch (e) {
      // ignore revoke errors
    }
  }, 2000);
};

const PdfPreviewer = () => {
  const [base64Input, setBase64Input] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  /**
   * Handles the PDF preview process by opening in a new tab
   */
  const handlePreviewReport = () => {
    // Validate input
    if (!base64Input.trim()) {
      alert('Error: Please paste a Base64 PDF string into the textarea.');
      return;
    }

    try {
      const blob = convertBase64ToPdfBlob(base64Input.trim());
      openPdfInNewTab(blob);
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('PDF Preview Error:', error);
    }
  };

  /**
   * Loads a sample PDF and immediately previews it in a new tab
   */
  const loadSample = (samplePdf) => {
    try {
      const blob = convertBase64ToPdfBlob(samplePdf.base64.trim());
      openPdfInNewTab(blob);
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('PDF Preview Error:', error);
    }
  };

  return (
    <div className="pdf-previewer">
      <div className="pdf-previewer-content">
        <div className="samples-section">
          <h3 className="samples-title">📚 Try Sample PDFs</h3>
          <div className="samples-buttons">
            {ALL_SAMPLES.map((sample, index) => (
              <button
                key={index}
                className="sample-button"
                onClick={() => loadSample(sample)}
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
          onChange={(e) => {
            setBase64Input(e.target.value);
            setIsManualInput(true); // Mark as manual input when user types
          }}
          placeholder="Paste your Base64 PDF string here.."
          rows={12}
        />

        {isManualInput && (
          <button
            className="preview-button"
            onClick={handlePreviewReport}
            disabled={!base64Input.trim()}
          >
            <span className="button-icon">🔍</span>
            Preview Report
          </button>
        )}
      </div>
    </div>
  );
};

export default PdfPreviewer;
