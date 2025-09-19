"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import Navbar from "@/components/navbar"
import ImageUpload from "@/components/image-upload"

interface AnalysisResult {
  routine_rating: {
    barrier_safety: number
    irritation_risk: number
    efficacy: number
    compatibility: number
    long_term_safety?: number
  }
  score_rationale: string
  score_explanations?: {
    barrier_safety: string
    irritation_risk: string
    efficacy: string
    compatibility: string
    long_term_safety: string
  }
  routine_plan: {
    am: string[]
    pm: string[]
    frequencies: Record<string, string>
  }
  products: Array<{
    query: string
    matched_product: string
    role: string
    key_benefits: string[]
    cautions: string[]
    ingredients_inci: { names: string[] } | "unknown"
    citations: string[]
    skin_impact?: string
  }>
  analysis: {
    pairs_summary?: {
      total_products: number
      risky_pairs: number
      headlines: string[]
    }
    pairs: Array<{
      between: [string, string]
      flags: Array<{
        type: "irritation_stack" | "redundancy" | "caution" | "makeup_skincare_interaction" | "pilling_risk" | "oxidization_risk"
        severity: "medium" | "high"
        why: string
        sources: string[]
      }>
      suggestions: string[]
    }>
    global_observations: string[]
    suggestions: string[]
    makeup_skincare_synergy?: string[]
  }
}

export default function Analyze() {
  const [products, setProducts] = useState("")
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ocrConfidence, setOcrConfidence] = useState("")

  const handleImageProcessed = (extractedProducts: string[], confidence: string) => {
    if (extractedProducts.length > 0) {
      // Add extracted products to existing products or replace if empty
      const currentProducts = products.trim() 
        ? products.split(/[,\n]/).map(p => p.trim()).filter(p => p.length > 0)
        : []
      
      const combinedProducts = [...currentProducts, ...extractedProducts]
      setProducts(combinedProducts.join(', '))
      setOcrConfidence(confidence)
      setError("")
    }
  }

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleAnalyze = async () => {
    if (!products.trim()) return

    setLoading(true)
    setError("")
    try {
      // Split by comma or newline, then clean up
      const productList = products
        .split(/[,\n]/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
      
      const response = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productList }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("API Response:", data) // Debug log
        setResults(data)
      } else {
        console.error("API Error:", response.status, await response.text())
        setError("Failed to analyze routine. Please try again.")
      }
    } catch (error) {
      console.error("Analysis failed:", error)
      setError("Analysis failed. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-[#cfeee0] text-green-800"
      case "medium":
        return "bg-yellow-200 text-yellow-800"
      case "high":
        return "bg-[#ffd7e0] text-pink-800"
      default:
        return "bg-gray-200 text-gray-800"
    }
  }

  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case "ok_together":
        return "bg-green-100 text-green-800"
      case "makeup_skincare_interaction":
        return "bg-blue-100 text-blue-800"
      case "pilling_risk":
        return "bg-orange-100 text-orange-800"
      case "oxidization_risk":
        return "bg-red-100 text-red-800"
      case "irritation_stack":
        return "bg-red-100 text-red-800"
      case "redundancy":
        return "bg-yellow-100 text-yellow-800"
      case "caution":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Analyze Your Routine</h1>
          <p className="text-lg text-gray-600 text-pretty">
            Enter your skincare and makeup products or upload an image to extract product names.
          </p>
        </div>

        {/* Image Upload Section */}
        <Card className="bg-white shadow-lg rounded-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Upload Product Image</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload 
              onImageProcessed={handleImageProcessed}
              onError={handleImageError}
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200 mb-6">
            <CardContent className="p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* OCR Confidence Display */}
        {ocrConfidence && ocrConfidence !== 'unknown' && (
          <Card className={`mb-6 ${
            ocrConfidence === 'high' ? 'bg-green-50 border-green-200' :
            ocrConfidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-orange-50 border-orange-200'
          }`}>
            <CardContent className="p-4">
              <p className={`text-sm ${
                ocrConfidence === 'high' ? 'text-green-800' :
                ocrConfidence === 'medium' ? 'text-yellow-800' :
                'text-orange-800'
              }`}>
                📸 Image recognition confidence: <strong>{ocrConfidence}</strong>
                {ocrConfidence === 'low' && ' - Please review the extracted product names and edit if needed.'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-lg rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Product List</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Textarea
              placeholder="List your products here, or use the image upload above to extract product names..."
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              className="min-h-32 mb-6 border-gray-200 rounded-xl"
            />
            <Button
              onClick={handleAnalyze}
              disabled={loading || !products.trim()}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl"
            >
              {loading ? "Analyzing..." : "Analyze Routine"}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-8">
            {/* Debug: Show raw JSON if structure is unexpected */}
            {(!results.routine_plan || !results.analysis || !results.products) && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-xl text-yellow-800">Debug: Raw API Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-gray-800 bg-white p-4 rounded border overflow-auto">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
            {/* Multi-Factor Rating */}
            <Card className="bg-white shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-800">Multi-Factor Routine Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Barrier Safety</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results.routine_rating.barrier_safety / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-semibold">{results.routine_rating.barrier_safety}/5</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Irritation Risk</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results.routine_rating.irritation_risk / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-semibold">{results.routine_rating.irritation_risk}/5</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Efficacy</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results.routine_rating.efficacy / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-semibold">{results.routine_rating.efficacy}/5</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Compatibility</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(results.routine_rating.compatibility / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-800 font-semibold">{results.routine_rating.compatibility}/5</span>
                    </div>
                  </div>
                  
                  {results.routine_rating.long_term_safety && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Long-term Safety</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(results.routine_rating.long_term_safety / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-800 font-semibold">{results.routine_rating.long_term_safety}/5</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-gray-700">{results.score_rationale}</p>
              </CardContent>
            </Card>

            {/* Routine Plan */}
            {results.routine_plan && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Recommended Routine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {results.routine_plan.am && results.routine_plan.am.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Morning (AM)</h4>
                      <ul className="space-y-1">
                        {results.routine_plan.am.map((product, index) => (
                          <li key={index} className="text-gray-700">• {product}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.routine_plan.pm && results.routine_plan.pm.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Evening (PM)</h4>
                      <ul className="space-y-1">
                        {results.routine_plan.pm.map((product, index) => (
                          <li key={index} className="text-gray-700">• {product}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.routine_plan.frequencies && Object.keys(results.routine_plan.frequencies).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Usage Frequencies</h4>
                      <div className="space-y-2">
                        {Object.entries(results.routine_plan.frequencies).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <span className="text-gray-700 font-medium">{key}:</span>
                            <div className="text-gray-600 ml-2">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Global Observations */}
            {results.analysis && results.analysis.global_observations && results.analysis.global_observations.length > 0 && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Global Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.analysis.global_observations.map((obs, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span className="text-gray-700">{obs}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Products */}
            {results.products && results.products.length > 0 && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Product Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {results.products.map((product, index) => (
                  <div key={index} className="border-l-4 border-[#cfeee0] pl-4">
                    <h4 className="font-semibold text-gray-800 mb-2">{product.matched_product}</h4>
                    <p className="text-sm text-gray-600 mb-3">Role: {product.role}</p>
                    
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-700 mb-1">Key Benefits:</h5>
                      <ul className="space-y-1">
                        {product.key_benefits.map((benefit, bIndex) => (
                          <li key={bIndex} className="text-sm text-gray-600">• {benefit}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-700 mb-1">Cautions:</h5>
                      <ul className="space-y-1">
                        {product.cautions.map((caution, cIndex) => (
                          <li key={cIndex} className="text-sm text-gray-600">• {caution}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {product.skin_impact && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-700 mb-1">Skin Impact:</h5>
                        <p className="text-sm text-gray-600">{product.skin_impact}</p>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {product.citations.map((citation, citIndex) => (
                        <a
                          key={citIndex}
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline block"
                        >
                          {citation}
                        </a>
                      ))}
                    </div>
                  </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Compatibility Issues */}
            {results.analysis && results.analysis.pairs && results.analysis.pairs.length > 0 && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Compatibility Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.analysis.pairs.map((pair, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-medium text-gray-800">
                          {pair.between[0]} + {pair.between[1]}
                        </span>
                      </div>
                      {pair.flags.map((flag, flagIndex) => (
                        <div key={flagIndex} className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getFlagTypeColor(flag.type)}`}
                            >
                              {flag.type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(flag.severity)}`}
                            >
                              {flag.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{flag.why}</p>
                        </div>
                      ))}
                      {pair.suggestions.length > 0 && (
                        <div className="mt-3">
                          <h6 className="font-medium text-gray-700 mb-1">Suggestions:</h6>
                          <ul className="space-y-1">
                            {pair.suggestions.map((suggestion, sIndex) => (
                              <li key={sIndex} className="text-sm text-gray-600">• {suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Makeup-Skincare Synergy */}
            {results.analysis && results.analysis.makeup_skincare_synergy && results.analysis.makeup_skincare_synergy.length > 0 && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Makeup & Skincare Synergy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.analysis.makeup_skincare_synergy.map((synergy, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span className="text-gray-700">{synergy}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {results.analysis && results.analysis.suggestions && results.analysis.suggestions.length > 0 && (
              <Card className="bg-white shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 p-6 bg-gray-100 rounded-2xl">
          <p className="text-sm text-gray-600 text-center">
      
          </p>
        </div>
      </main>
    </div>
  )
}
