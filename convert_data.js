const fs = require('fs');

const inputFile = 'data.json';
const outputFile = 'data.json';

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    // Parse line function: split by tab, remove +=" or =" wrappers
    const parseLine = (line) => {
        // Split by tab or assuming simple structure if tabs are lost (but pasted content usually keeps tabs)
        // From the view_file output, it looks like `="..."<tab>="..."`
        // We can split by `\t` first.
        const parts = line.split('\t');
        return parts.map(p => {
            // Match content inside "..."
            const match = p.match(/="([^"]*)"/);
            return match ? match[1] : p.replace(/^\+=?"/, '').replace(/"$/, '');
        });
    };

    const headers = parseLine(lines[0]);
    console.log("Headers:", headers);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index] || "";
        });
        data.push(row);
    }

    fs.writeFileSync(outputFile, JSON.stringify(data, null, 4), 'utf8');
    console.log("Conversion successful. Total records:", data.length);
    console.log("First item:", data[0]);

} catch (e) {
    console.error("Error:", e);
}
