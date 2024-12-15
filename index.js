const express = require('express');
const pdfMake = require('pdfmake');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Directory to store generated PDFs
const pdfDirectory = path.join(__dirname, 'generated_pdfs');
if (!fs.existsSync(pdfDirectory)) {
    fs.mkdirSync(pdfDirectory); // Ensure directory exists
}

app.post('/generate-pdf', (req, res) => {
    const data = req.body; // Get data from the POST request body

    if (!data.transactions || !data.balance) {
        return res.status(400).send('Missing required data');
    }

    // Define fonts
    const fonts = {
        Roboto: {
            normal: path.resolve('./Roboto-Regular.ttf'),
            bold: path.resolve('./Roboto-Medium.ttf'),
            italics: path.resolve('./Roboto-Italic.ttf'),
            bolditalics: path.resolve('./Roboto-MediumItalic.ttf')
        }
    };

    const printer = new pdfMake(fonts);

    // Define document structure
    const documentDefinition = {
        content: [
            {
                columns: [
                    { image: './logo.jpg', width: 50 }, // Use absolute path for image
                    { text: 'MSV Public School Rambha', style: 'orgName', alignment: 'center' },
                    ''
                ],
                margin: [0, 0, 0, 20]
            },
            { text: `Transactions for ${data.person.name}`, style: 'header' },
            { text: `Mobile: ${data.person.mobile}`, margin: [0, 0, 0, 20] },
            {
                table: {
                    headerRows: 1,
                    widths: ['20%', '30%', '15%', '15%', '20%'],
                    body: [
                        [
                            { text: 'Date', bold: true },
                            { text: 'Description', bold: true },
                            { text: 'Credit', bold: true },
                            { text: 'Debit', bold: true },
                            { text: 'Balance', bold: true }
                        ],
                        ...data.transactions.map((transaction, index) => {
                            const credit = transaction.type === 'credit' ? transaction.amount.toFixed(2) : '';
                            const debit = transaction.type === 'debit' ? (-transaction.amount).toFixed(2) : '';
                            const runningBalance = data.transactions
                                .slice(0, index + 1)
                                .reduce((acc, curr) => acc + curr.amount, 0);
                            return [
                                transaction.date,
                                transaction.description,
                                { text: credit, color: 'green' },
                                { text: debit, color: 'red' },
                                { text: runningBalance.toFixed(2), color: runningBalance >= 0 ? 'green' : 'red' }
                            ];
                        })
                    ]
                },
                margin: [0, 0, 0, 20]
            },
            {
                text: `Total Balance: ${data.balance.current_balance.toFixed(2)} ${data.balance.currency}`,
                style: 'total',
                color: data.balance.current_balance >= 0 ? 'green' : 'red'
            },
            { image: './logo.jpg', alignment: 'right', width: 50, margin: [0, 50, 0, 0] },
            {
                text: 'Signature',
                style: 'signature',
            }
        ],
        styles: {
            orgName: {
                fontSize: 16,
                bold: true,
                margin: [0, 10, 0, 0]
            },
            header: {
                fontSize: 18,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },
            total: {
                fontSize: 14,
                bold: true,
                alignment: 'right',
                margin: [0, 20, 0, 0]
            },
            signature: {
                alignment: 'right',
                italics: true,
                fontSize: 12
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);

    // Use the person's name in the file name
    const fileName = `${data.person.name.replace(/\s+/g, '_')}_transactions.pdf`;
    const filePath = path.join(pdfDirectory, fileName);

    // Save the PDF to the file system
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end();

    // After the PDF is written, return the URL for downloading it
    pdfDoc.on('end', () => {
        const fileUrl = `https://api-kiuw.onrender.com/generate-pdf/generated_pdfs/${fileName}`;
        res.json({ downloadUrl: fileUrl }); // Send the download URL in the response
    });
});

app.use('/generated_pdfs', express.static(pdfDirectory)); // Serve generated PDFs via static middleware

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`)
});
