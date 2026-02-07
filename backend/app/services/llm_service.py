"""
LLM Service for text summarization
Uses OpenAI to simplify and summarize text for sign language translation
"""
import os
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.llm = None
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the OpenAI LLM"""
        if self.api_key:
            self.llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0.3,
                api_key=self.api_key
            )
    
    def is_available(self) -> bool:
        """Check if LLM is available"""
        return self.llm is not None
    
    async def summarize_for_signs(self, text: str, max_words: int = 10) -> str:
        """
        Summarize and simplify text for sign language translation.
        
        The goal is to:
        1. Keep only essential meaning
        2. Use simple, common words
        3. Remove articles and unnecessary words
        4. Make it as short as possible while keeping meaning
        
        Args:
            text: The input text to summarize
            max_words: Maximum number of words in output
            
        Returns:
            Simplified text optimized for sign language
        """
        if not self.is_available():
            # Fallback: basic simplification without LLM
            return self._basic_simplify(text)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Tu es un expert en Langue des Signes Française (LSF).
Ta tâche est de simplifier le texte pour le rendre plus facile à traduire en signes.

Règles STRICTES:
1. Maximum {max_words} mots
2. Garde seulement les mots essentiels (action, sujet, objet)
3. Supprime les articles (le, la, les, un, une, des)
4. Supprime les mots vides (est, sont, qui, que, donc)
5. Utilise des mots simples et courants
6. Structure: SUJET + ACTION + COMPLEMENT
7. Réponse en MAJUSCULES
8. Seulement le texte simplifié, rien d'autre

Exemples:
- "Je voudrais savoir comment vous allez aujourd'hui" → "TOI BIEN ?"
- "Est-ce que tu peux m'aider s'il te plaît" → "TOI AIDER MOI"
- "Je suis très content de te revoir après tout ce temps" → "MOI CONTENT REVOIR TOI"
- "Il fait vraiment très beau aujourd'hui" → "AUJOURD'HUI BEAU"
"""),
            ("human", "{text}")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        try:
            result = await chain.ainvoke({
                "text": text,
                "max_words": max_words
            })
            return result.strip().upper()
        except Exception as e:
            print(f"LLM Error: {e}")
            return self._basic_simplify(text)
    
    def _basic_simplify(self, text: str) -> str:
        """Basic text simplification without LLM"""
        # Remove common French articles and stopwords
        stopwords = {
            'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'à', 'au', 'aux',
            'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
            'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
            'qui', 'que', 'quoi', 'dont', 'où', 'est', 'sont', 'suis', 'es',
            'et', 'ou', 'mais', 'donc', 'car', 'ni', 'ne', 'pas', 'plus',
            'très', 'bien', 'vraiment', 'aussi', 'encore', 'toujours',
            'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
            'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'par'
        }
        
        words = text.lower().split()
        filtered = [w for w in words if w not in stopwords and len(w) > 1]
        
        # Limit to 10 words
        result = ' '.join(filtered[:10])
        return result.upper()


# Global instance
llm_service = LLMService()
