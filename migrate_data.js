const fs = require('fs');
const path = require('path');

const files = [
    { name: 'recipes.js', varName: 'RECIPES_DATA' },
    { name: 'fish.js', varName: 'FISH_DATA' },
    { name: 'insects.js', varName: 'INSECTS_DATA' },
    { name: 'crops.js', varName: 'CROPS_DATA' },
    { name: 'flowers.js', varName: 'FLOWERS_DATA' }
];

files.forEach(file => {
    try {
        const filePath = path.join(__dirname, 'js', file.name);
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping ${file.name}, not found.`);
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        // Regex to extract the array content: everything between [ and the last ]
        const match = content.match(/=\s*(\[[\s\S]*\])\s*;/);

        if (match && match[1]) {
            let jsonStr = match[1];
            // Fix potential trailing commas which valid JS allows but JSON doesn't
            jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

            const jsonPath = path.join(__dirname, 'data', file.name.replace('.js', '.json'));

            // Validate it's valid JSON
            try {
                JSON.parse(jsonStr); // Test parse
                fs.writeFileSync(jsonPath, jsonStr, 'utf8');
                console.log(`Converted ${file.name} to ${jsonPath}`);
            } catch (jsonErr) {
                // Fallback: evaluate the JS code to get the object (unsafe but fine for local conversion script)
                // We can use eval() here strictly for migration
                const data = eval(jsonStr);
                fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf8');
                console.log(`Converted ${file.name} using eval fallback`);
            }
        } else {
            console.log(`Could not parse pattern in ${file.name}`);
        }
    } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
    }
});
