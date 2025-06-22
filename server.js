const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/Img', express.static('Img'));

// Función recursiva para encontrar archivos JSON
async function findJsonFiles(dir, fileList = []) {
    try {
        const files = await fs.readdir(dir, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(dir, file.name);

            if (file.isDirectory()) {
                // Recursivamente buscar en subdirectorios
                await findJsonFiles(filePath, fileList);
            } else if (file.name.endsWith('.json')) {
                // Calcular la ruta relativa desde el directorio base
                const relativePath = path.relative('Datos', filePath);
                const folder = path.dirname(relativePath);

                fileList.push({
                    name: file.name,
                    path: filePath,
                    relativePath: relativePath,
                    folder: folder === '.' ? '' : folder
                });
            }
        }
    } catch (error) {
        console.error(`Error leyendo directorio ${dir}:`, error);
    }

    return fileList;
}

// Endpoint para obtener lista de archivos JSON
app.get('/api/files', async (req, res) => {
    try {
        const datosPath = path.join(__dirname, 'Datos');
        const files = await findJsonFiles(datosPath);

        console.log(`Encontrados ${files.length} archivos JSON`);

        // Enviar información de archivos al cliente
        const fileInfo = files.map(f => ({
            name: f.name,
            folder: f.folder,
            path: `/api/json/${f.folder ? f.folder + '/' : ''}${f.name}`
        }));

        res.json(fileInfo);
    } catch (error) {
        console.error('Error obteniendo archivos:', error);
        res.status(500).json({ error: 'Error al obtener archivos' });
    }
});

// Endpoint para servir archivos JSON específicos
app.get('/api/json/:folder?/:filename', async (req, res) => {
    try {
        const { folder, filename } = req.params;
        let filePath;

        if (folder && filename) {
            filePath = path.join(__dirname, 'Datos', folder, filename);
        } else if (folder && !filename) {
            // Si solo hay un parámetro, es el filename
            filePath = path.join(__dirname, 'Datos', folder);
        } else {
            return res.status(400).json({ error: 'Ruta inválida' });
        }

        const data = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(data);

        res.json(jsonData);
    } catch (error) {
        console.error('Error leyendo archivo:', error);
        res.status(404).json({ error: 'Archivo no encontrado' });
    }
});

// Endpoint para buscar en todos los JSONs
app.post('/api/search', async (req, res) => {
    try {
        const { query, type } = req.body;
        const datosPath = path.join(__dirname, 'Datos');
        const files = await findJsonFiles(datosPath);
        const results = [];

        for (const file of files) {
            try {
                const data = await fs.readFile(file.path, 'utf8');
                const jsonData = JSON.parse(data);

                // Buscar específicamente conos de luz
                if (type === 'lightcone') {
                    if (jsonData.Refinements ||
                        (jsonData.Rarity && jsonData.Rarity.includes('Lightcone')) ||
                        file.folder.toLowerCase().includes('lightcone') ||
                        file.folder.toLowerCase().includes('cono')) {
                        results.push({
                            file: file.name,
                            folder: file.folder,
                            data: jsonData
                        });
                    }
                } else {
                    // Búsqueda general
                    const jsonString = JSON.stringify(jsonData).toLowerCase();
                    if (jsonString.includes(query.toLowerCase())) {
                        results.push({
                            file: file.name,
                            folder: file.folder,
                            data: jsonData
                        });
                    }
                }
            } catch (error) {
                // Ignorar archivos con errores
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({ error: 'Error al buscar' });
    }
});

// Servir el HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Estructura esperada:');
    console.log('- /Datos');
    console.log('  - /Characters');
    console.log('  - /Lightcones');
    console.log('  - /Weapons');
    console.log('  - etc...');
});