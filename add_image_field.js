const fs = require('fs');
const path = require('path');

const files = [
    'js/recipes.js',
    'js/insects.js',
    'js/fish.js',
    'js/crops.js',
    'js/flowers.js'
];

files.forEach(filePath => {
    const absolutePath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) return;

    let content = fs.readFileSync(absolutePath, 'utf8');

    // Extract the variable name (e.g., RECIPES_DATA)
    const varMatch = content.match(/const (\w+) =/);
    if (!varMatch) return;
    const varName = varMatch[1];

    // Extract the array content
    const startBracket = content.indexOf('[');
    const endBracket = content.lastIndexOf(']');
    if (startBracket === -1 || endBracket === -1) return;

    const jsonStr = content.substring(startBracket, endBracket + 1);

    try {
        // Parse the pseudo-JSON (it's actually JS objects)
        // Since it's a .js file, we can't always JSON.parse directly if there are single quotes or no quotes on keys.
        // But our files are mostly valid JSON arrays.
        let data = JSON.parse(jsonStr);

        // Add "Imagen" property to each object if it doesn't exist
        data = data.map(item => {
            if (item.Imagen === undefined) {
                // Try to guess a filename based on the name or just empty
                const name = item.Receta || item.Nombre || "";
                return { ...item, "Imagen": "" };
            }
            return item;
        });

        const newContent = `const ${varName} = ${JSON.stringify(data, null, 4)};\n`;
        fs.writeFileSync(absolutePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    } catch (e) {
        console.error(`Error parsing ${filePath}: ${e.message}`);
    }
});
