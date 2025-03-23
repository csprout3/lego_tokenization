import { CheckCircle } from "lucide-react"

export default function Conclusion() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-teal-600">Conclusion: Key Takeaways</h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <p className="mb-6">
            Just as LEGO bricks can be assembled in countless ways, tokenization offers different approaches to breaking
            down text for machine learning models. Here's what we've learned:
          </p>

          <ul className="space-y-4">
            <li className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0" />
              <span>
                <strong>Tokenization is fundamental</strong> to how language models process text, converting human
                language into numerical representations.
              </span>
            </li>

            <li className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0" />
              <span>
                <strong>Different tokenization methods</strong> have different strengths and weaknesses, from simple
                whitespace splitting to sophisticated subword approaches.
              </span>
            </li>

            <li className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0" />
              <span>
                <strong>Subword tokenization</strong> helps models handle rare words, morphologically rich languages,
                and out-of-vocabulary terms by breaking words into meaningful pieces.
              </span>
            </li>

            <li className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0" />
              <span>
                <strong>Token IDs</strong> convert text into numbers that models can process, with each unique token
                assigned a unique ID in the vocabulary.
              </span>
            </li>

            <li className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-teal-500 flex-shrink-0" />
              <span>
                <strong>Word embeddings</strong> represent tokens as vectors in a high-dimensional space, capturing
                semantic relationships between words.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-teal-50 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-4 text-teal-700">Why Tokenization Matters</h3>

          <div className="space-y-4">
            <p>
              The way text is tokenized directly impacts how well a language model can understand and generate language.
              Good tokenization helps models:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>Handle vocabulary more efficiently</li>
              <li>Process unknown words gracefully</li>
              <li>Capture meaningful linguistic units</li>
              <li>Work across different languages</li>
              <li>Reduce the size of the vocabulary</li>
            </ul>

            <p className="mt-4">
              Next time you interact with a language model like ChatGPT, Claude, or Gemini, remember that behind the scenes, your
              text is being broken down into tokens, converted to IDs, and processed through layers of neural
              networks—all starting with the tokenization process we've explored in this interactive experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

