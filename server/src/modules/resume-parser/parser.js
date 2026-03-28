import { PDFParse } from 'pdf-parse';

/**
 * Parses resume text from a PDF buffer, cleans it, and ensures it's substantial enough.
 * Captures all pages by default using PDFParse class.
 */
export const parseResume = async (fileBuffer) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    console.log('PDF-PARSE: Initializing parser with buffer length:', fileBuffer.length);
    
    // Modern PDF-Parse (ESM version) uses the PDFParse class
    let parser;
    try {
        parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
    } catch (initErr) {
        console.error('PDF-PARSE: Initialization error:', initErr);
        throw new Error(`Failed to initialize PDF parser: ${initErr.message}`);
    }

    let result;
    try {
        result = await parser.getText();
        console.log('PDF-PARSE: Text extraction result:', !!result?.text);
    } catch (textErr) {
        console.error('PDF-PARSE: Extraction error:', textErr);
        throw new Error(`Failed to extract text from PDF: ${textErr.message}`);
    } finally {
        if (parser) {
            try {
                await parser.destroy();
                console.log('PDF-PARSE: Parser instance destroyed.');
            } catch (destErr) {
                console.warn('PDF-PARSE: Destroy error (non-critical):', destErr.message);
            }
        }
    }

    let extractedText = result.text;

    if (!extractedText) {
      throw new Error('No text content extracted from PDF');
    }

    // --- CLEANING LOGIC ---
    // 1. Remove extra whitespaces, newlines, and tabs
    // 2. Remove non-printable/strange special characters (keep basic punctuation and alphanumeric)
    let cleanedText = extractedText
      .replace(/[\r\n\t]+/g, ' ')           // Replace newlines/tabs with space
      .replace(/[^\x20-\x7E]/g, '')        // Remove non-ASCII characters
      .replace(/\s\s+/g, ' ')              // Replace multiple spaces with single space
      .trim();

    console.log('--- DEBUG: RESUME EXTRACTION COMPLETE ---');
    console.log(`Original Length: ${extractedText.length} chars`);
    console.log(`Cleaned Length: ${cleanedText.length} chars`);
    
    // Show the beginning
    console.log('START OF RESUME:', cleanedText.substring(0, 1000) + '...');
    
    // Show the end to confirm full extraction
    if (cleanedText.length > 1000) {
        console.log('END OF RESUME:', '...' + cleanedText.substring(cleanedText.length - 1000));
    }
    console.log('-----------------------------------------');

    // --- SUBSTANCE CHECK ---
    if (cleanedText.length < 100) {
      throw new Error('Extracted text is too short (less than 100 characters). Please upload a more detailed resume.');
    }

    return cleanedText;
  } catch (error) {
    console.error('PDF PARSE ERROR:', error);
    throw new Error(`PDF Parsing failed: ${error.message}`);
  }
};
