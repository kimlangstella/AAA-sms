
export const exportToExcel = (fileName: string, htmlContent: string) => {
    // Basic Excel template with styles
    const template = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Attendance Report</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                body { font-family: Arial, sans-serif; }
                table { border-collapse: collapse; }
                th { 
                    background-color: #4F46E5; 
                    color: white; 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: center;
                    font-weight: bold;
                }
                td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: center;
                }
                .student-name { text-align: left; font-weight: bold; }
                .present { color: #059669; font-weight: bold; }
                .absent { color: #DC2626; font-weight: bold; }
                .late { color: #D97706; font-weight: bold; }
                .header-info { font-size: 14px; font-weight: bold; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xls`; // Using .xls for compatibility with HTML content
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
