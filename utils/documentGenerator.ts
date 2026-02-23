import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';

export const generateWordDocument = async (title: string, markdownContent: string) => {
    // A very basic markdown-to-docx converter for MVP
    // In a real app, you'd want to parse bold, italics, lists, etc. properly.
    // For now, we will split by lines and create paragraphs.

    const lines = markdownContent.split('\n');
    const children: any[] = [];

    // Add Title
    children.push(
        new Paragraph({
            text: title || "Agent Arga Document",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
        })
    );

    for (const line of lines) {
        if (line.trim() === '') {
            children.push(new Paragraph({ text: '' }));
            continue;
        }

        // Check if it's a heading
        if (line.startsWith('### ')) {
            children.push(new Paragraph({ text: line.replace('###', '').trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({ text: line.replace('##', '').trim(), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        } else if (line.startsWith('# ')) {
            children.push(new Paragraph({ text: line.replace('#', '').trim(), heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            children.push(new Paragraph({ text: line.substring(2).trim(), bullet: { level: 0 } }));
        } else {
            children.push(new Paragraph({ children: [new TextRun({ text: line })] }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `${safeTitle || 'document'}.docx`);
};

export const generatePdfDocument = async (title: string, markdownContent: string) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    let yOffset = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const safeTitle = title || "Agent Arga Document";
    doc.text(safeTitle, margin, yOffset);
    yOffset += 10;

    // Body
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Very basic markdown stripping for PDF MVP. 
    // jsPDF doesn't natively parse markdown. We'll strip basic tags and wrap text.
    const cleanText = markdownContent
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // italic
        .replace(/#/g, '') // headers
        .replace(/`/g, ''); // code

    const lines = cleanText.split('\n');

    for (const line of lines) {
        if (line.trim() === '') {
            yOffset += 5;
            continue;
        }

        const splitText = doc.splitTextToSize(line, maxLineWidth);

        // Page break logic
        if (yOffset + (splitText.length * 5) > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yOffset = 20;
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
        }

        doc.text(splitText, margin, yOffset);
        yOffset += (splitText.length * 6);
    }

    doc.save(`${safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};
