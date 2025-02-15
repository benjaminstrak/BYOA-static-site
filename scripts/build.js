const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '../src/content');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const TEMPLATE_DIR = path.join(__dirname, '../src/templates');
const CONVERTKIT_TEMPLATE = path.join(TEMPLATE_DIR, 'convertkit.html');

async function build() {
    try {
        // Clean and create dist directory
        await fs.emptyDir(OUTPUT_DIR);
        
        // Copy static assets
        await fs.copy(path.join(__dirname, '../src/static/css'), path.join(OUTPUT_DIR, 'css'));
        
        // Copy index.html first
        await fs.copy(path.join(__dirname, '../src/index.html'), path.join(OUTPUT_DIR, 'index.html'));
        
        // Read templates
        const baseTemplate = await fs.readFile(path.join(TEMPLATE_DIR, 'base.html'), 'utf8');
        const blogTemplate = await fs.readFile(path.join(TEMPLATE_DIR, 'blog.html'), 'utf8');
        const convertkitTemplate = await fs.readFile(CONVERTKIT_TEMPLATE, 'utf8');
        
        // Copy and process HTML pages
        const pagesDir = path.join(__dirname, '../src/pages');
        const pages = await fs.readdir(pagesDir);
        
        for (const page of pages) {
            if (page === 'index.html') continue; // Skip index.html as it's handled separately
            
            console.log(`Processing HTML page: ${page}`);
            let content = await fs.readFile(path.join(pagesDir, page), 'utf8');
            
            // Replace convertkit placeholder
            content = content.replace('{{convertkit}}', convertkitTemplate);
            
            const outputPath = path.join(OUTPUT_DIR, page);
            await fs.outputFile(outputPath, content);
        }
        
        // Build regular pages
        const pagesDir = path.join(CONTENT_DIR, 'pages');
        const pages = await fs.readdir(pagesDir);
        
        for (const page of pages) {
            if (page === 'index.md') continue;
            
            console.log(`Building page: ${page}`);
            const content = await fs.readFile(path.join(pagesDir, page), 'utf8');
            const { attributes, body } = frontMatter(content);
            const htmlContent = marked(body);
            
            const finalHtml = baseTemplate
                .replace('{{title}}', attributes.title)
                .replace('{{content}}', htmlContent)
                .replace('{{convertkit}}', convertkitTemplate);
                
            const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
        
        // Build blog posts
        const blogDir = path.join(CONTENT_DIR, 'blog');
        const blogOutputDir = path.join(OUTPUT_DIR, 'blog');
        await fs.ensureDir(blogOutputDir);
        
        // Check if blog directory exists and create it if it doesn't
        await fs.ensureDir(blogDir);
        
        const posts = await fs.readdir(blogDir);
        console.log('Found blog posts:', posts); // Debug log
        
        const blogPosts = [];
        
        for (const post of posts) {
            console.log(`Building blog post: ${post}`);
            const content = await fs.readFile(path.join(blogDir, post), 'utf8');
            const { attributes, body } = frontMatter(content);
            
            // Skip the first H1 heading in the markdown content
            const contentLines = body.split('\n');
            const filteredContent = contentLines
                .filter(line => !line.trim().startsWith('# '))
                .join('\n')
                .trim();
            
            const htmlContent = marked(filteredContent);
            
            // Store post data for the blog index
            blogPosts.push({
                title: attributes.title,
                date: attributes.date,
                slug: post.replace('.md', ''),
                excerpt: body.split('\n\n')[0].replace('# ', '') // Clean up excerpt
            });
            
            const finalHtml = blogTemplate
                .replace(/\{\{title\}\}/g, attributes.title)
                .replace('{{date}}', formatDate(attributes.date))
                .replace('{{content}}', htmlContent)
                .replace('{{convertkit}}', convertkitTemplate);
                
            const outputPath = path.join(blogOutputDir, post.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
        
        // Create blog index page even if no posts exist
        const blogIndexHtml = generateBlogIndex(blogPosts);
        await fs.outputFile(path.join(OUTPUT_DIR, 'blog.html'), blogIndexHtml);
        
        console.log('Blog posts processed:', blogPosts.length);
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        throw error;
    }
}

function generateBlogIndex(posts) {
    // Sort posts by date, most recent first
    posts.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;  // Reverse chronological order
    });
    
    const postsHtml = posts.map(post => `
        <article class="blog-preview">
            <h2><a href="blog/${post.slug}.html">${post.title}</a></h2>
            <div class="post-meta">
                <time datetime="${post.date}">${formatDate(post.date)}</time>
            </div>
            <p>${post.excerpt}</p>
            <a href="blog/${post.slug}.html" class="read-more">Read more →</a>
        </article>
    `).join('\n');
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Llama Life Blog | Llama Land</title>
            <link rel="stylesheet" href="css/style.css">
        </head>
        <body>
            <header>
                <nav>
                    <div class="logo"><a href="index.html">Llama Land</a></div>
                    <div class="nav-links">
                        <a href="blog.html">Llama Life Blog</a>
                        <a href="about.html">About</a>
                        <a href="contact.html">Contact</a>
                        <a href="adopt.html" class="btn-dark">Meet a Llama</a>
                    </div>
                </nav>
            </header>
            
            <main class="blog-index">
                <h1>Llama Life Blog</h1>
                ${postsHtml}
            </main>

            <footer>
                <p>&copy; 2024 Llama Land. All rights reserved.</p>
            </footer>
        </body>
        </html>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

if (require.main === module) {
    build().catch(console.error);
}

module.exports = { build }; 