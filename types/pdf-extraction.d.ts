// types/pdf-extraction.d.ts
declare module "pdf-extraction" {
     interface PdfData {
       text: string;
     }
   
     export default function pdf(
       dataBuffer: Buffer
     ): Promise<PdfData>;
   }
   