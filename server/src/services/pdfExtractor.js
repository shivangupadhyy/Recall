import fs from 'fs';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    
    // Check if the extracted text has actual content.
    // If it only contains page markers and whitespace/newlines, it's likely a scanned PDF or image.
    const cleanedText = data.text.replace(/\[\[PAGE_\d+\]\]/g, '').trim();
    
    if (cleanedText.length > 50) {
      console.log(`[PDF Extractor] Successfully extracted text using pdf-parse (${cleanedText.length} chars).`);
      return data.text;
    }
    
    // Fall back to Gemini Multimodal OCR
    console.log(`[PDF Extractor] No text extracted by pdf-parse. Falling back to Gemini Multimodal OCR...`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured (GEMINI_API_KEY). Cannot perform OCR fallback.');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const pdfBase64 = dataBuffer.toString('base64');
    const prompt = "Extract all text from this PDF file. For every page in the PDF, insert a marker like '[[PAGE_X]]' where X is the page number (starting from 1), at the beginning of the text for that page. Return ONLY the extracted text. Perform OCR to extract all readable text from any images inside the PDF. Do not skip any pages, and preserve the layout and order of text as much as possible.";
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      }
    ]);
    
    let extractedText = result.response.text();
    // Clean up any markdown code block wrapper that the model might return
    if (extractedText.startsWith('```')) {
      extractedText = extractedText.replace(/^```[a-zA-Z]*\n/, '');
      extractedText = extractedText.replace(/\n```$/, '');
    }
    extractedText = extractedText.trim();
    
    console.log(`[PDF Extractor] Successfully extracted text using Gemini OCR (${extractedText.length} chars).`);
    return extractedText;
  } catch (error) {
    console.error(`PDF Extraction Error for file ${filePath}:`, error.message);
    throw error;
  }
};

export default {
  extractTextWithPageMarkers,
};
