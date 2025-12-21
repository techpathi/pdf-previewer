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
 * - Opens PDF in new tab using window.open()
 * - Converts Base64 to Blob for memory efficiency
 * - Sample PDFs for quick testing
 * - Error handling with user feedback
 */
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
      // Process the Base64 string
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

      // Convert Base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create Blob from binary data
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Verify it's a valid PDF blob
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty. Please check your Base64 data.');
      }

      // Create Blob URL and open in new tab
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

    } catch (error) {
      // Show error message
      alert(`Error: ${error.message}`);
      console.error('PDF Preview Error:', error);
    }
  };

  /**
   * Loads a sample PDF and immediately previews it in a new tab
   */
  const loadSample = (samplePdf) => {
    setBase64Input(samplePdf.base64);
    setIsManualInput(false); // Mark as not manual input

    try {
      // Process the Base64 string
      let base64Data = samplePdf.base64.trim();

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

      // Convert Base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create Blob from binary data
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Verify it's a valid PDF blob
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty. Please check your Base64 data.');
      }

      // Create Blob URL and open in new tab
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

    } catch (error) {
      // Show error message
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
