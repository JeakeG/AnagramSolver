from flask import Flask, render_template, request, jsonify
import os

from anagram.AnagramEngine import AnagramSolver

app = Flask(__name__, 
           template_folder='web',  # Use 'web' instead of 'templates'
           static_folder='web')    # Also serve static files from 'web'

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=['POST'])
def processText():
    data = request.json
    inputText = data.get('text', '')
    excludedWords = data.get('excludedWords', [])
    requiredWords = data.get('requiredWords', [])
    
    anagramSolver = AnagramSolver("./resources/words", maxResults=100)
    results = anagramSolver.solveAnagram(inputText, excludedWords=excludedWords, requiredWords=requiredWords)
    jsonResults = [list(wordSet) for wordSet in results]
    
    return jsonify({"status": "success", "results": jsonResults})

if __name__ == "__main__":
    app.run(debug=True)