/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    return config;
  },
};

// Check if word2vec embeddings exist, if not generate them
const embeddingsPath = path.join(__dirname, 'public', 'word2vec-embeddings.json');
if (!fs.existsSync(embeddingsPath)) {
  console.log('Word2Vec embeddings not found, generating...');
  try {
    execSync('npm run generate-embeddings', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
  }
}

module.exports = nextConfig; 