import * as pdf from 'pdf-parse';
console.log('pdf-parse exports:', Object.keys(pdf));
console.log('pdf default export:', typeof pdf.default);
if (pdf.PDFParse) {
  console.log('PDFParse is available');
} else {
  console.log('PDFParse is NOT available');
}
