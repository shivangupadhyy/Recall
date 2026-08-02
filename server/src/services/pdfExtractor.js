import fs from 'fs';
import pdf from 'pdf-parse';

/**
 * Extract text from a PDF file and inject markers to identify page boundaries.
 * @param {string} filePath Absolute or relative path to the PDF file
 * @returns {Promise<string>} Full document text with page markers, e.g. [[PAGE_1]], [[PAGE_2]]
 */
export const extractTextWithPageMarkers = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);

  const options = {
    pagerender: function (pageData) {
      return pageData.getTextContent().then(function (textContent) {
        const text = textContent.items.map((item) => item.str).join(' ');
        const pageNum = pageData.pageNumber;
        return `\n[[PAGE_${pageNum}]]\n` + text;
      });
    },
  };

  try {
    const data = await pdf(dataBuffer, options);
    return data.text;
  } catch (error) {
    console.error(`PDF Extraction Error for file ${filePath}:`, error.message);
    throw error;
  }
};

export default {
  extractTextWithPageMarkers,
};
