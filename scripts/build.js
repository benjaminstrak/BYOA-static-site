const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '../src/content');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const TEMPLATE_DIR = path.join(__dirname, '../src/templates');

async function build() {
    try {
        // Clean and create dist directory
        await fs.emptyDir(OUTPUT_DIR);
        
        // Copy static assets
        await fs.copy(path.join(__dirname, '../src/static/css'), path.join(OUTPUT_DIR, 'css'));
        
        // Read base template
        const baseTemplate = await fs.readFile(path.join(TEMPLATE_DIR, 'base.html'), 'utf8');
        
        // Build pages
        const pagesDir = path.join(CONTENT_DIR, 'pages');
        const pages = await fs.readdir(pagesDir);
        
        for (const page of pages) {
            console.log(`Building page: ${page}`);
            const content = await fs.readFile(path.join(pagesDir, page), 'utf8');
            const { attributes, body } = frontMatter(content);
            const htmlContent = marked(body);
            
            const finalHtml = baseTemplate
                .replace('{{title}}', attributes.title)
                .replace('{{content}}', htmlContent);
                
            const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
            console.log(`Created: ${outputPath}`);
        }
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        throw error;
    }
}

// Export the build function and run it if this is the main script
if (require.main === module) {
    build().catch(console.error);
}

module.exports = { build }; 