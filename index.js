const express = require('express');
const pdfMake = require('pdfmake');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

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

    // Calculate totals
    const totals = data.transactions.reduce((acc, transaction) => {
        if (transaction.type === 'credit') {
            acc.totalCredit += transaction.amount;
        } else if (transaction.type === 'debit') {
            acc.totalDebit += Math.abs(transaction.amount); // Debit amounts stored as negative
        }
        return acc;
    }, { totalCredit: 0, totalDebit: 0 });

    // Define document structure
    const documentDefinition = {
        content: [
            {
                columns: [
                    { image: './logo.jpg', width: 50 },
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
                    widths: ['20%', '35%', '20%', '20%'],
                    body: [
                        // Header row
                        [
                            { text: 'Date', bold: true },
                            { text: 'Description', bold: true },
                            { text: 'Credit', bold: true },
                            { text: 'Debit', bold: true },
                        ],
                        // Transaction rows
                        ...data.transactions.map((transaction, index) => {
                            const credit = transaction.type === 'credit' ? transaction.amount.toFixed(2) : '';
                            const debit = transaction.type === 'debit' ? (-transaction.amount).toFixed(2) : '';
                            return [
                                transaction.date,
                                transaction.description,
                                { text: credit, color: 'green' },
                                { text: debit, color: 'red' }
                            ];
                        }),
                        // Row to show totals
                        [
                            { text: 'Total', bold: true, alignment: 'right', colSpan: 2 }, {},
                            { text: totals.totalCredit.toFixed(2), bold: true, color: 'green' },
                            { text: totals.totalDebit.toFixed(2), bold: true, color: 'red' }
                        ],
                        // Row to show closing balance
                        [
                            { text: 'Closing Balance', bold: true, alignment: 'right', colSpan: 3 }, {}, {},
                            { text: data.balance.current_balance.toFixed(2) + ' ' + data.balance.currency, bold: true, color: 'blue' }
                        ]
                    ]
                },
                margin: [0, 0, 0, 10]
            },
            { image: './signature.jpg', alignment: 'right', width: 50, margin: [0, 50, 0, 0] },
            { image: './IMG-20250330-WA0002.jpg', alignment: 'left', width: 70, margin: [0, 50, 0, 0] }
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
            closingBalance: {
                fontSize: 14,
                bold: true,
                alignment: 'center',
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

    // Set response headers to prompt a download in the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');

    // Pipe the PDF document directly to the response
    pdfDoc.pipe(res);
    pdfDoc.end();
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
