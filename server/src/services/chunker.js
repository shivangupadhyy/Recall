/**
 * Chunks text while maintaining overlap and associating chunks with their corresponding PDF page number.
 * @param {string} text Raw text with [[PAGE_X]] markers
 * @param {number} chunkSize Maximum characters per chunk (default 600)
 * @param {number} overlap Characters to overlap between consecutive chunks (default 100)
 * @returns {Array<{text: string, pageNumber: number, chunkIndex: number}>} Array of chunks
 */
export const createChunks = (text, chunkSize = 600, overlap = 100) => {
  if (!text) return [];

  const chunks = [];
  let chunkIndex = 0;
  
  // Find all page boundaries and their indices in the text
  const pageRegex = /\[\[PAGE_(\d+)\]\]/g;
  const pageMarkers = [];
  let match;
  
  while ((match = pageRegex.exec(text)) !== null) {
    pageMarkers.push({
      page: parseInt(match[1], 10),
      index: match.index,
      length: match[0].length
    });
  }

  // Helper to find the page number for a given character index in the raw text
  const getPageNum = (charIndex) => {
    if (pageMarkers.length === 0) return 1;
    // Find the latest page marker that starts before or at this charIndex
    let currentPage = 1;
    for (const marker of pageMarkers) {
      if (marker.index <= charIndex) {
        currentPage = marker.page;
      } else {
        break;
      }
    }
    return currentPage;
  };

  // Clean the text by replacing page markers with spaces of equal length to preserve indices
  let cleanedText = text;
  for (const marker of pageMarkers) {
    const spaces = ' '.repeat(marker.length);
    cleanedText = cleanedText.slice(0, marker.index) + spaces + cleanedText.slice(marker.index + marker.length);
  }

  // Perform sliding window chunking on the cleaned text
  let start = 0;
  while (start < cleanedText.length) {
    let end = start + chunkSize;
    if (end > cleanedText.length) {
      end = cleanedText.length;
    }

    // Try to break at a word boundary (space) if we're not at the very end
    if (end < cleanedText.length) {
      const lastSpace = cleanedText.lastIndexOf(' ', end);
      // Ensure we don't shrink the chunk too much (at least 80% of desired chunk size)
      if (lastSpace > start + chunkSize * 0.8) {
        end = lastSpace;
      }
    }

    const chunkText = cleanedText.slice(start, end).trim();
    
    // Only save chunks that have actual content (more than 10 non-whitespace chars)
    if (chunkText.replace(/\s/g, '').length > 10) {
      const pageNumber = getPageNum(start);
      chunks.push({
        text: chunkText,
        pageNumber,
        chunkIndex
      });
      chunkIndex++;
    }

    // Advance sliding window (chunk size minus overlap)
    start = end - overlap;
    if (start >= cleanedText.length || end === cleanedText.length) {
      break;
    }
    // Prevent infinite loop if overlap is misconfigured
    if (start <= 0 || start <= (end - chunkSize)) {
      start = end;
    }
  }

  return chunks;
};

export default {
  createChunks
};
