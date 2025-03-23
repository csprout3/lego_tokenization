// Static word embeddings for visualization purposes
// Each word is represented by a 5-dimensional vector
import { useEffect, useState } from 'react';

// Interface for embedding types
export type WordEmbeddings = {
  [word: string]: number[];
};

// A cache to store loaded embeddings
let embeddingsCache: WordEmbeddings | null = null;
let pendingEmbeddings: {[key: string]: Promise<number[] | null>} = {};
let isInitializing = false;

// Get static pre-defined word embeddings
export function getStaticWordEmbeddings(): WordEmbeddings {
  return {
    // Common pronouns and articles
    "the": [0.0, 0.0, 0.0, 0.0, 0.0],
    "The": [0.0, 0.0, 0.0, 0.0, 0.1],
    "a": [0.1, 0.0, 0.0, 0.0, 0.0],
    "an": [0.1, 0.1, 0.0, 0.0, 0.0],
    "this": [0.2, 0.1, 0.0, 0.0, 0.0],
    "that": [0.2, -0.1, 0.0, 0.0, 0.0],
    "it": [0.1, 0.0, 0.1, 0.0, 0.0],
    "he": [0.3, 0.0, 0.0, 0.0, 0.0],
    "she": [0.3, 0.0, 0.0, 0.0, -0.1],
    "they": [0.3, 0.1, 0.0, 0.0, 0.0],
    "we": [0.3, 0.2, 0.0, 0.0, 0.0],
    "i": [0.3, -0.1, 0.0, 0.0, 0.0],
    "you": [0.3, -0.2, 0.0, 0.0, 0.0],
    
    // Common prepositions and conjunctions
    "in": [0.1, 0.0, 0.1, 0.1, 0.0],
    "on": [0.1, 0.0, 0.1, -0.1, 0.0],
    "at": [0.1, 0.0, 0.2, 0.0, 0.0],
    "by": [0.1, 0.0, -0.1, 0.0, 0.0],
    "for": [0.1, 0.0, -0.2, 0.0, 0.0],
    "with": [0.1, 0.0, 0.0, 0.1, 0.0],
    "to": [0.1, 0.0, 0.0, -0.1, 0.0],
    "from": [0.1, 0.0, -0.1, -0.1, 0.0],
    "and": [0.0, 0.1, 0.0, 0.0, 0.0],
    "or": [0.0, -0.1, 0.0, 0.0, 0.0],
    "but": [0.0, -0.2, 0.0, 0.0, 0.0],
    "over": [0.1, 0.0, 0.2, 0.2, 0.0],
    
    // Animals
    "dog": [0.7, 0.3, 0.2, 0.5, 0.4],
    "cat": [0.6, 0.3, 0.2, 0.5, -0.3],
    "puppy": [0.7, 0.4, 0.3, 0.5, 0.4],
    "kitten": [0.6, 0.4, 0.3, 0.5, -0.3],
    "fox": [0.65, 0.3, 0.25, 0.45, 0.35],
    "wolf": [0.7, 0.25, 0.2, 0.4, 0.35],
    "bird": [0.5, 0.35, 0.25, 0.6, -0.2],
    "fish": [0.4, 0.35, 0.2, 0.55, -0.3],
    "lion": [0.75, 0.25, 0.3, 0.4, 0.45],
    "tiger": [0.75, 0.25, 0.3, 0.45, 0.4],
    "bear": [0.7, 0.3, 0.35, 0.45, 0.5],
    "elephant": [0.65, 0.2, 0.4, 0.35, 0.45],
    "mouse": [0.55, 0.4, 0.2, 0.5, -0.3],
    "horse": [0.65, 0.3, 0.2, 0.45, 0.4],
    "animal": [0.6, 0.3, 0.25, 0.5, 0.0],
    "pet": [0.6, 0.35, 0.25, 0.5, 0.1],
    
    // Actions
    "run": [0.2, 0.8, 0.5, 0.1, 0.6],
    "jump": [0.3, 0.7, 0.5, 0.1, 0.5],
    "walk": [0.1, 0.6, 0.4, 0.1, 0.4],
    "sprint": [0.2, 0.9, 0.6, 0.1, 0.7],
    "eat": [0.3, 0.6, 0.4, 0.2, 0.3],
    "drink": [0.3, 0.5, 0.4, 0.2, 0.2],
    "sleep": [0.1, 0.3, 0.2, 0.1, 0.1],
    "think": [0.2, 0.2, 0.3, 0.5, 0.4],
    "speak": [0.4, 0.4, 0.3, 0.3, 0.4],
    "talk": [0.4, 0.45, 0.3, 0.3, 0.4],
    "move": [0.2, 0.7, 0.4, 0.1, 0.3],
    "sit": [0.1, 0.3, 0.2, 0.1, 0.2],
    "stand": [0.1, 0.4, 0.2, 0.1, 0.3],
    "play": [0.3, 0.6, 0.5, 0.2, 0.5],
    "write": [0.35, 0.5, 0.3, 0.4, 0.3],
    "read": [0.3, 0.4, 0.3, 0.5, 0.3],
    
    // Descriptive adjectives (colors, etc.)
    "quick": [0.7, 0.3, 0.6, 0.4, 0.2],
    "fast": [0.8, 0.3, 0.6, 0.4, 0.2],
    "slow": [0.2, 0.7, 0.3, 0.6, 0.4],
    "lazy": [0.15, 0.8, 0.2, 0.7, 0.3],
    "active": [0.7, 0.2, 0.5, 0.3, 0.2],
    "red": [0.5, 0.3, 0.1, 0.7, 0.1],
    "blue": [0.4, 0.3, 0.1, 0.7, -0.1],
    "green": [0.45, 0.3, 0.1, 0.7, 0.0],
    "yellow": [0.5, 0.3, 0.1, 0.7, 0.2],
    "black": [0.3, 0.3, 0.1, 0.7, -0.2],
    "white": [0.3, 0.3, 0.1, 0.7, 0.2],
    "brown": [0.4, 0.5, 0.3, 0.6, 0.5],
    "big": [0.6, 0.2, 0.3, 0.5, 0.4],
    "small": [0.3, 0.2, 0.3, 0.5, -0.4],
    "large": [0.65, 0.2, 0.3, 0.5, 0.45],
    "tiny": [0.25, 0.2, 0.3, 0.5, -0.45],
    "tall": [0.6, 0.2, 0.3, 0.6, 0.4],
    "short": [0.3, 0.2, 0.3, 0.6, -0.4],
    "good": [0.5, 0.4, 0.3, 0.2, 0.5],
    "bad": [0.5, 0.4, 0.3, 0.2, -0.5],
    "happy": [0.4, 0.5, 0.4, 0.2, 0.6],
    "sad": [0.4, 0.5, 0.4, 0.2, -0.6],
    "hot": [0.4, 0.3, 0.7, 0.2, 0.4],
    "cold": [0.4, 0.3, 0.7, 0.2, -0.4],
    
    // Common objects
    "house": [0.5, 0.2, 0.2, 0.6, 0.1],
    "home": [0.5, 0.25, 0.2, 0.6, 0.15],
    "car": [0.4, 0.5, 0.1, 0.3, 0.1],
    "truck": [0.45, 0.5, 0.15, 0.3, 0.15],
    "bike": [0.35, 0.5, 0.1, 0.3, 0.05],
    "tree": [0.3, 0.1, 0.3, 0.6, 0.2],
    "flower": [0.3, 0.15, 0.25, 0.55, 0.15],
    "book": [0.2, 0.2, 0.1, 0.6, 0.3],
    "table": [0.3, 0.2, 0.15, 0.5, 0.1],
    "chair": [0.3, 0.2, 0.15, 0.45, 0.1],
    "door": [0.25, 0.3, 0.15, 0.5, 0.05],
    "window": [0.25, 0.3, 0.15, 0.55, 0.05],
    "computer": [0.2, 0.3, 0.1, 0.4, 0.4],
    "phone": [0.2, 0.3, 0.1, 0.4, 0.35],
    "food": [0.4, 0.3, 0.4, 0.3, 0.2],
    "water": [0.2, 0.3, 0.5, 0.3, 0.0],
    
    // Nature
    "sun": [0.5, 0.2, 0.7, 0.3, 0.4],
    "moon": [0.5, 0.2, 0.7, 0.3, -0.4],
    "star": [0.5, 0.2, 0.6, 0.35, 0.3],
    "sky": [0.3, 0.2, 0.5, 0.4, 0.3],
    "cloud": [0.3, 0.2, 0.5, 0.4, 0.1],
    "rain": [0.2, 0.3, 0.6, 0.3, -0.1],
    "snow": [0.2, 0.3, 0.6, 0.3, -0.3],
    "wind": [0.3, 0.4, 0.5, 0.2, 0.1],
    "forest": [0.3, 0.1, 0.3, 0.5, 0.2],
    "mountain": [0.4, 0.1, 0.2, 0.6, 0.3],
    "river": [0.2, 0.3, 0.5, 0.4, 0.1],
    "lake": [0.2, 0.25, 0.5, 0.4, 0.0],
    "ocean": [0.2, 0.2, 0.5, 0.4, 0.2],
    "beach": [0.3, 0.2, 0.4, 0.4, 0.1],
    "grass": [0.3, 0.1, 0.3, 0.5, 0.1],
    "earth": [0.3, 0.15, 0.3, 0.5, 0.2],
    
    // Time and numbers
    "time": [0.3, 0.3, 0.1, 0.3, 0.2],
    "day": [0.3, 0.3, 0.2, 0.3, 0.3],
    "night": [0.3, 0.3, 0.2, 0.3, -0.3],
    "year": [0.3, 0.3, 0.1, 0.3, 0.15],
    "month": [0.3, 0.3, 0.1, 0.3, 0.1],
    "week": [0.3, 0.3, 0.1, 0.3, 0.05],
    "one": [0.15, 0.15, 0.15, 0.15, 0.1],
    "two": [0.15, 0.15, 0.15, 0.15, 0.2],
    "three": [0.15, 0.15, 0.15, 0.15, 0.3],
    "four": [0.15, 0.15, 0.15, 0.15, 0.4],
    "five": [0.15, 0.15, 0.15, 0.15, 0.5],
    "ten": [0.15, 0.15, 0.15, 0.15, 0.6],
    "first": [0.2, 0.15, 0.15, 0.15, 0.1],
    "last": [0.2, 0.15, 0.15, 0.15, -0.1],
    
    // LEGO and technology specific terms
    "token": [0.1, 0.1, 0.1, 0.3, 0.9],
    "tokenization": [0.15, 0.1, 0.1, 0.3, 0.85],
    "text": [0.2, 0.1, 0.1, 0.2, 0.8],
    "word": [0.1, 0.1, 0.1, 0.2, 0.8],
    "sentence": [0.2, 0.1, 0.1, 0.25, 0.75],
    "language": [0.2, 0.2, 0.1, 0.3, 0.8],
    "model": [0.25, 0.2, 0.1, 0.4, 0.7],
    "vector": [0.2, 0.2, 0.1, 0.4, 0.6],
    "embedding": [0.2, 0.2, 0.1, 0.35, 0.75],
    "lego": [0.3, 0.4, 0.2, 0.5, 0.6],
    "brick": [0.35, 0.3, 0.2, 0.4, 0.5],
    "block": [0.35, 0.3, 0.2, 0.4, 0.45],
    "build": [0.3, 0.5, 0.2, 0.4, 0.4],
    "machine": [0.25, 0.4, 0.2, 0.3, 0.5],
    "learning": [0.2, 0.3, 0.2, 0.3, 0.7],
    "artificial": [0.2, 0.3, 0.2, 0.25, 0.65],
    "intelligence": [0.2, 0.3, 0.2, 0.3, 0.75],
    
    // Emotions and feelings
    "love": [0.4, 0.6, 0.3, 0.7, 0.8],
    "hate": [0.6, 0.4, 0.7, 0.3, -0.8],
    "fear": [0.3, 0.7, 0.2, 0.8, -0.6],
    "joy": [0.7, 0.3, 0.6, 0.4, 0.7],
    "peace": [0.3, 0.7, 0.2, 0.8, 0.6],
    "hope": [0.5, 0.5, 0.4, 0.6, 0.7],
    "dream": [0.4, 0.6, 0.3, 0.7, 0.6],
    "believe": [0.5, 0.5, 0.4, 0.6, 0.5],
    
    // Family and relationships
    "family": [0.5, 0.5, 0.4, 0.6, 0.7],
    "mother": [0.5, 0.5, 0.4, 0.6, 0.8],
    "father": [0.5, 0.5, 0.4, 0.6, 0.8],
    "sister": [0.5, 0.5, 0.4, 0.6, 0.7],
    "brother": [0.5, 0.5, 0.4, 0.6, 0.7],
    "friend": [0.5, 0.5, 0.4, 0.6, 0.6],
    "neighbor": [0.5, 0.5, 0.4, 0.6, 0.5],
    "community": [0.5, 0.5, 0.4, 0.6, 0.4],
    
    // Education and learning
    "learn": [0.6, 0.4, 0.5, 0.5, 0.7],
    "teach": [0.6, 0.4, 0.5, 0.5, 0.7],
    "study": [0.6, 0.4, 0.5, 0.5, 0.6],
    "school": [0.5, 0.5, 0.4, 0.6, 0.6],
    "university": [0.5, 0.5, 0.4, 0.6, 0.7],
    "knowledge": [0.6, 0.4, 0.5, 0.5, 0.7],
    "wisdom": [0.6, 0.4, 0.5, 0.5, 0.8],
    "understanding": [0.6, 0.4, 0.5, 0.5, 0.7],
    
    // Technology and innovation
    "internet": [0.4, 0.6, 0.3, 0.7, 0.7],
    "software": [0.4, 0.6, 0.3, 0.7, 0.6],
    "hardware": [0.4, 0.6, 0.3, 0.7, 0.5],
    "network": [0.4, 0.6, 0.3, 0.7, 0.5],
    "data": [0.4, 0.6, 0.3, 0.7, 0.4],
    "digital": [0.4, 0.6, 0.3, 0.7, 0.6],
    "virtual": [0.4, 0.6, 0.3, 0.7, 0.5],
    
    // Business and work
    "work": [0.6, 0.4, 0.5, 0.5, 0.5],
    "business": [0.6, 0.4, 0.5, 0.5, 0.6],
    "company": [0.6, 0.4, 0.5, 0.5, 0.5],
    "market": [0.6, 0.4, 0.5, 0.5, 0.4],
    "product": [0.6, 0.4, 0.5, 0.5, 0.5],
    "service": [0.6, 0.4, 0.5, 0.5, 0.5],
    "customer": [0.6, 0.4, 0.5, 0.5, 0.4],
    "employee": [0.6, 0.4, 0.5, 0.5, 0.4],
    
    // Health and wellness
    "health": [0.5, 0.5, 0.4, 0.6, 0.6],
    "medicine": [0.5, 0.5, 0.4, 0.6, 0.7],
    "doctor": [0.5, 0.5, 0.4, 0.6, 0.7],
    "patient": [0.5, 0.5, 0.4, 0.6, 0.6],
    "hospital": [0.5, 0.5, 0.4, 0.6, 0.6],
    "treatment": [0.5, 0.5, 0.4, 0.6, 0.7],
    "recovery": [0.5, 0.5, 0.4, 0.6, 0.6],
    "wellness": [0.5, 0.5, 0.4, 0.6, 0.6],
    
    // Arts and creativity
    "art": [0.4, 0.6, 0.3, 0.7, 0.6],
    "music": [0.4, 0.6, 0.3, 0.7, 0.7],
    "dance": [0.4, 0.6, 0.3, 0.7, 0.6],
    "paint": [0.4, 0.6, 0.3, 0.7, 0.5],
    "draw": [0.4, 0.6, 0.3, 0.7, 0.5],
    "create": [0.4, 0.6, 0.3, 0.7, 0.7],
    "design": [0.4, 0.6, 0.3, 0.7, 0.6],
    
    // Sports and recreation
    "sport": [0.6, 0.4, 0.5, 0.5, 0.5],
    "game": [0.6, 0.4, 0.5, 0.5, 0.5],
    "team": [0.6, 0.4, 0.5, 0.5, 0.5],
    "player": [0.6, 0.4, 0.5, 0.5, 0.5],
    "coach": [0.6, 0.4, 0.5, 0.5, 0.6],
    "win": [0.6, 0.4, 0.5, 0.5, 0.7],
    "lose": [0.6, 0.4, 0.5, 0.5, -0.7],
    
    // Food and drink
    "bread": [0.5, 0.5, 0.4, 0.6, 0.4],
    "meat": [0.5, 0.5, 0.4, 0.6, 0.4],
    "fruit": [0.5, 0.5, 0.4, 0.6, 0.5],
    "vegetable": [0.5, 0.5, 0.4, 0.6, 0.5],
    "coffee": [0.5, 0.5, 0.4, 0.6, 0.4],
    "tea": [0.5, 0.5, 0.4, 0.6, 0.4],
    
    // Transportation
    "bus": [0.4, 0.6, 0.3, 0.7, 0.4],
    "train": [0.4, 0.6, 0.3, 0.7, 0.5],
    "plane": [0.4, 0.6, 0.3, 0.7, 0.6],
    "boat": [0.4, 0.6, 0.3, 0.7, 0.5],
    "drive": [0.4, 0.6, 0.3, 0.7, 0.5],
    "travel": [0.4, 0.6, 0.3, 0.7, 0.6],
    
    // Time and frequency
    "today": [0.5, 0.5, 0.4, 0.6, 0.3],
    "tomorrow": [0.5, 0.5, 0.4, 0.6, 0.3],
    "yesterday": [0.5, 0.5, 0.4, 0.6, 0.3],
    
    // Sample Text and Common Phrases
    "hello world": [0.25, 0.35, 0.15, 0.55, 0.6],
    "how are you": [0.26, 0.36, 0.16, 0.56, 0.61],
    "nice to meet you": [0.27, 0.37, 0.17, 0.57, 0.62],
    "thank you very much": [0.28, 0.38, 0.18, 0.58, 0.63],
    "good morning": [0.29, 0.39, 0.19, 0.59, 0.64],
    "good afternoon": [0.3, 0.4, 0.2, 0.6, 0.65],
    "good evening": [0.31, 0.41, 0.21, 0.61, 0.66], 
    "see you later": [0.32, 0.42, 0.22, 0.62, 0.67],
    "have a nice day": [0.33, 0.43, 0.23, 0.63, 0.68],
    "what time is it": [0.34, 0.44, 0.24, 0.64, 0.69],
    "where are you from": [0.35, 0.45, 0.25, 0.65, 0.7],
    "my name is": [0.36, 0.46, 0.26, 0.66, 0.71],
    "i like to": [0.37, 0.47, 0.27, 0.67, 0.72],
    "can you help me": [0.38, 0.48, 0.28, 0.68, 0.73],
    
    // Educational Terms
    "student": [0.4, 0.5, 0.3, 0.7, 0.6],
    "classroom": [0.41, 0.51, 0.31, 0.71, 0.61],
    "homework": [0.42, 0.52, 0.32, 0.72, 0.62],
    "exam": [0.43, 0.53, 0.33, 0.73, 0.63],
    "quiz": [0.44, 0.54, 0.34, 0.74, 0.64],
    "project": [0.45, 0.55, 0.35, 0.75, 0.65],
    "paper": [0.46, 0.56, 0.36, 0.76, 0.66],
    "professor": [0.47, 0.57, 0.37, 0.77, 0.67],
    "lecture": [0.48, 0.58, 0.38, 0.78, 0.68],
    "research": [0.49, 0.59, 0.39, 0.79, 0.69],
    
    // Sample Text for Tokenization Examples
    "machine learning": [0.5, 0.6, 0.4, 0.5, 0.7],
    "deep learning": [0.51, 0.61, 0.41, 0.51, 0.71],
    "neural network": [0.52, 0.62, 0.42, 0.52, 0.72],
    "natural language processing": [0.53, 0.63, 0.43, 0.53, 0.73],
    "computer vision": [0.54, 0.64, 0.44, 0.54, 0.74],
    "reinforcement learning": [0.55, 0.65, 0.45, 0.55, 0.75],
    "artificial intelligence": [0.56, 0.66, 0.46, 0.56, 0.76],
    "data science": [0.57, 0.67, 0.47, 0.57, 0.77],
    "big data": [0.58, 0.68, 0.48, 0.58, 0.78],
    "cloud computing": [0.59, 0.69, 0.49, 0.59, 0.79],
    
    // Common Verbs
    "go": [0.6, 0.3, 0.5, 0.4, 0.5],
    "come": [0.61, 0.31, 0.51, 0.41, 0.51],
    "see": [0.62, 0.32, 0.52, 0.42, 0.52],
    "look": [0.63, 0.33, 0.53, 0.43, 0.53],
    "find": [0.64, 0.34, 0.54, 0.44, 0.54],
    "make": [0.65, 0.35, 0.55, 0.45, 0.55],
    "take": [0.66, 0.36, 0.56, 0.46, 0.56],
    "give": [0.67, 0.37, 0.57, 0.47, 0.57],
    "job": [0.68, 0.38, 0.58, 0.48, 0.58],
    "call": [0.69, 0.39, 0.59, 0.49, 0.59],
    "try": [0.7, 0.4, 0.6, 0.5, 0.6],
    "ask": [0.71, 0.41, 0.61, 0.51, 0.61],
    "need": [0.72, 0.42, 0.62, 0.52, 0.62],
    "feel": [0.73, 0.43, 0.63, 0.53, 0.63],
    "become": [0.74, 0.44, 0.64, 0.54, 0.64],
  };
}

// Initialize the embeddings system - load core embeddings first
export async function initializeEmbeddings(): Promise<void> {
  if (isInitializing || embeddingsCache) return;
  
  isInitializing = true;
  
  try {
    // Start with our static embeddings for immediate use
    embeddingsCache = getStaticWordEmbeddings();
    
    // Optionally fetch additional embeddings asynchronously
    const additionalEmbeddings = await fetchAdditionalEmbeddings();
    
    // Merge with static embeddings
    embeddingsCache = {
      ...embeddingsCache,
      ...additionalEmbeddings
    };
    
    console.log(`Embeddings initialized with ${Object.keys(embeddingsCache).length} words`);
  } catch (error) {
    console.error("Failed to initialize embeddings:", error);
  } finally {
    isInitializing = false;
  }
}

// Simulate fetching additional embeddings from a remote source or local larger file
// In a real implementation, this could load from a CDN or IndexedDB
async function fetchAdditionalEmbeddings(): Promise<WordEmbeddings> {
  // This is a placeholder - in a real implementation you'd:
  // 1. Fetch a chunk of embeddings from a server
  // 2. Or load from a local IndexedDB store
  // 3. Or load a quantized/compressed model via WebAssembly
  
  // For demo, simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return additional common words and phrases for a more extensive embedding space
  return {
    // Common everyday words
    "democracy": [0.4, 0.3, 0.2, 0.5, 0.7],
    "freedom": [0.45, 0.35, 0.25, 0.5, 0.75],
    "justice": [0.42, 0.32, 0.22, 0.52, 0.72],
    "education": [0.3, 0.4, 0.3, 0.6, 0.8],
    "wellness": [0.35, 0.45, 0.25, 0.55, 0.65],
    "science": [0.25, 0.35, 0.25, 0.65, 0.75],
    "technology": [0.2, 0.3, 0.2, 0.6, 0.8],
    
    // Sample text phrases (avoiding duplicates with static embeddings)
    "hello there": [0.3, 0.4, 0.2, 0.5, 0.6],
    "world map": [0.32, 0.42, 0.22, 0.52, 0.62],
    "thanks a lot": [0.4, 0.5, 0.3, 0.6, 0.7],
    "please help": [0.38, 0.48, 0.28, 0.58, 0.68],
    "welcome home": [0.36, 0.46, 0.26, 0.56, 0.66],
    "goodbye friend": [0.34, 0.44, 0.24, 0.54, 0.64],
    
    // Programming related
    "code": [0.25, 0.3, 0.2, 0.55, 0.75],
    "program": [0.26, 0.31, 0.21, 0.56, 0.76],
    "function": [0.27, 0.32, 0.22, 0.57, 0.77],
    "variable": [0.28, 0.33, 0.23, 0.58, 0.78],
    "algorithm": [0.29, 0.34, 0.24, 0.59, 0.79],
    "python": [0.3, 0.35, 0.25, 0.6, 0.8],
    "javascript": [0.31, 0.36, 0.26, 0.61, 0.81],
    
    // Countries
    "america": [0.5, 0.4, 0.3, 0.6, 0.5],
    "china": [0.51, 0.41, 0.31, 0.61, 0.51],
    "india": [0.52, 0.42, 0.32, 0.62, 0.52],
    "japan": [0.53, 0.43, 0.33, 0.63, 0.53],
    "germany": [0.54, 0.44, 0.34, 0.64, 0.54],
    "france": [0.55, 0.45, 0.35, 0.65, 0.55],
    "brazil": [0.56, 0.46, 0.36, 0.66, 0.56],
    
    // Fruits
    "apple": [0.6, 0.3, 0.4, 0.5, 0.3],
    "banana": [0.61, 0.31, 0.41, 0.51, 0.31],
    "orange": [0.62, 0.32, 0.42, 0.52, 0.32],
    "grape": [0.63, 0.33, 0.43, 0.53, 0.33],
    "strawberry": [0.64, 0.34, 0.44, 0.54, 0.34],
    "blueberry": [0.65, 0.35, 0.45, 0.55, 0.35],
    "pineapple": [0.66, 0.36, 0.46, 0.56, 0.36],
    
    // Sports
    "soccer": [0.7, 0.4, 0.3, 0.5, 0.6],
    "football": [0.71, 0.41, 0.31, 0.51, 0.61],
    "basketball": [0.72, 0.42, 0.32, 0.52, 0.62],
    "tennis": [0.73, 0.43, 0.33, 0.53, 0.63],
    "golf": [0.74, 0.44, 0.34, 0.54, 0.64],
    "swimming": [0.75, 0.45, 0.35, 0.55, 0.65],
    "running": [0.76, 0.46, 0.36, 0.56, 0.66],
    
    // Clothing
    "shirt": [0.4, 0.5, 0.6, 0.3, 0.4],
    "pants": [0.41, 0.51, 0.61, 0.31, 0.41],
    "shoes": [0.42, 0.52, 0.62, 0.32, 0.42],
    "hat": [0.43, 0.53, 0.63, 0.33, 0.43],
    "socks": [0.44, 0.54, 0.64, 0.34, 0.44],
    "jacket": [0.45, 0.55, 0.65, 0.35, 0.45],
    "sweater": [0.46, 0.56, 0.66, 0.36, 0.46],
    
    // Occupations
    "professor": [0.3, 0.6, 0.4, 0.5, 0.7],
    "physician": [0.31, 0.61, 0.41, 0.51, 0.71],
    "engineer": [0.32, 0.62, 0.42, 0.52, 0.72],
    "scientist": [0.33, 0.63, 0.43, 0.53, 0.73],
    "artist": [0.34, 0.64, 0.44, 0.54, 0.74],
    "writer": [0.35, 0.65, 0.45, 0.55, 0.75],
    "programmer": [0.36, 0.66, 0.46, 0.56, 0.76],
    
    // Weather
    "sunny": [0.5, 0.7, 0.5, 0.3, 0.4],
    "rainy": [0.51, 0.71, 0.51, 0.31, 0.41],
    "cloudy": [0.52, 0.72, 0.52, 0.32, 0.42],
    "snowy": [0.53, 0.73, 0.53, 0.33, 0.43],
    "windy": [0.54, 0.74, 0.54, 0.34, 0.44],
    "stormy": [0.55, 0.75, 0.55, 0.35, 0.45],
    "foggy": [0.56, 0.76, 0.56, 0.36, 0.46],
    
    // Vehicles
    "airplane": [0.7, 0.5, 0.3, 0.4, 0.5],
    "helicopter": [0.71, 0.51, 0.31, 0.41, 0.51],
    "motorcycle": [0.72, 0.52, 0.32, 0.42, 0.52],
    "subway": [0.73, 0.53, 0.33, 0.43, 0.53],
    "bicycle": [0.74, 0.54, 0.34, 0.44, 0.54],
    "scooter": [0.75, 0.55, 0.35, 0.45, 0.55],
    "skateboard": [0.76, 0.56, 0.36, 0.46, 0.56]
  };
}

// Get embedding for a single word - with dynamic loading capability
export async function getWordEmbedding(word: string): Promise<number[] | null> {
  // Normalize word
  const normalizedWord = word.toLowerCase().trim();
  
  // Check cache first
  if (embeddingsCache && normalizedWord in embeddingsCache) {
    return embeddingsCache[normalizedWord];
  }
  
  // Check if we're already fetching this word
  if (normalizedWord in pendingEmbeddings) {
    return pendingEmbeddings[normalizedWord];
  }
  
  // Otherwise try to fetch it (in real implementation)
  try {
    pendingEmbeddings[normalizedWord] = fetchWordEmbedding(normalizedWord);
    const embedding = await pendingEmbeddings[normalizedWord];
    
    // Update cache
    if (embeddingsCache && embedding) {
      embeddingsCache[normalizedWord] = embedding;
    }
    
    delete pendingEmbeddings[normalizedWord];
    return embedding;
  } catch (error) {
    console.error(`Failed to fetch embedding for "${normalizedWord}":`, error);
    delete pendingEmbeddings[normalizedWord];
    return null;
  }
}

// Simulate fetching a specific word embedding
// In production this would call a lightweight API or use a WebAssembly module
async function fetchWordEmbedding(word: string): Promise<number[] | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate a pseudorandom but consistent embedding based on the word
  // This is just for demonstration - NOT for production use
  if (word.length > 0) {
    // Use character codes to generate a deterministic but varied embedding
    const seed = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) / 100;
    return [
      Math.sin(seed) * 0.5,
      Math.cos(seed) * 0.5,
      Math.sin(seed * 2) * 0.4,
      Math.cos(seed * 2) * 0.4,
      (Math.sin(seed * 3) + Math.cos(seed * 3)) * 0.3
    ];
  }
  
  return null;
}

// Compute cosine similarity between two embedding vectors
export function computeSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

// Find similar words to a given query with a worker for better performance
export async function findSimilarWords(
  word: string, 
  limit: number = 10, 
  threshold: number = 0.5
): Promise<{word: string; similarity: number}[]> {
  const wordEmbedding = await getWordEmbedding(word);
  if (!wordEmbedding || !embeddingsCache) return [];
  
  // Using a batch processing approach for better UI responsiveness
  return new Promise((resolve) => {
    // This would ideally be in a Web Worker in production
    setTimeout(() => {
      const results = Object.entries(embeddingsCache!)
        .filter(([key]) => key !== word)
        .map(([key, vector]) => ({
          word: key,
          similarity: computeSimilarity(wordEmbedding, vector)
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      resolve(results);
    }, 0); // Schedule in next event loop to avoid blocking UI
  });
}

// React hook for getting embeddings with loading state
export function useWordEmbedding(word: string) {
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchEmbedding = async () => {
      if (!word.trim()) {
        setEmbedding(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Initialize embeddings system if needed
        if (!embeddingsCache) {
          await initializeEmbeddings();
        }
        
        const result = await getWordEmbedding(word);
        
        if (isMounted) {
          setEmbedding(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load embedding");
          setLoading(false);
        }
      }
    };
    
    fetchEmbedding();
    
    return () => {
      isMounted = false;
    };
  }, [word]);
  
  return { embedding, loading, error };
}

// React hook for finding similar words with loading state
export function useSimilarWords(word: string, limit: number = 10, threshold: number = 0.5) {
  const [similarWords, setSimilarWords] = useState<{word: string; similarity: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchSimilarWords = async () => {
      if (!word.trim()) {
        setSimilarWords([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Initialize embeddings system if needed
        if (!embeddingsCache) {
          await initializeEmbeddings();
        }
        
        const results = await findSimilarWords(word, limit, threshold);
        
        if (isMounted) {
          setSimilarWords(results);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to find similar words");
          setLoading(false);
        }
      }
    };
    
    fetchSimilarWords();
    
    return () => {
      isMounted = false;
    };
  }, [word, limit, threshold]);
  
  return { similarWords, loading, error };
} 