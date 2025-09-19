"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import Navbar from "@/components/navbar"
import ImageUpload from "@/components/image-upload"
import { Stepper } from "@/components/Stepper"
import { UploadDropzone } from "@/components/UploadDropzone"
import { ProductChips } from "@/components/ProductChips"
import { Section } from "@/components/ui/section"
import { Scorecard } from "@/components/scorecard"
import { ProductAccordion } from "@/components/product-accordion"
import { Tag } from "@/components/ui/tag"

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
  const [productChips, setProductChips] = useState<string[]>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [error, setError] = useState("")
  const [ocrConfidence, setOcrConfidence] = useState("")

  const handleImageProcessed = (extractedProducts: string[], confidence: string) => {
    if (extractedProducts.length > 0) {
      // Add extracted products to chips
      setProductChips(prev => [...prev, ...extractedProducts])
      setOcrConfidence(confidence)
      setError("")
      setStep(2)
    }
  }

  const handleFile = async (file: File) => {
    setOcrLoading(true)
    setError("")
    
    // Call your existing OCR endpoint
    const body = new FormData()
    body.append("image", file)
    try {
      const response = await fetch("/api/ocr", { method: "POST", body })
      const result = await response.json()
      
      if (result.products && result.products.length > 0) {
        handleImageProcessed(result.products, result.confidence || 'unknown')
      } else {
        setError('No product names could be extracted from the image. Please try a clearer image or enter products manually.')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      setError('Failed to extract text from image. Please try again.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleAnalyze = async () => {
    if (productChips.length === 0) return

    setLoading(true)
    setError("")
    setStep(3)
    try {
      const response = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productChips }),
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


  const bg = "bg-[#FFF7F1]"; // soft cream page bg

  return (
    <div className={`min-h-screen ${bg}`}>
      <Navbar />

      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Analyze Your Routine</h1>
          <p className="text-lg text-gray-600 text-pretty">
            Upload a photo or list your products to get a personalized review.
          </p>
        </div>

        <Stepper step={step} />

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* OCR Confidence Display */}
        {ocrConfidence && ocrConfidence !== 'unknown' && (
          <div className={`mb-6 rounded-2xl border p-4 ${
            ocrConfidence === 'high' ? 'bg-green-50 border-green-200' :
            ocrConfidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-sm ${
              ocrConfidence === 'high' ? 'text-green-800' :
              ocrConfidence === 'medium' ? 'text-yellow-800' :
              'text-orange-800'
            }`}>
              Image Confidence: <strong>{ocrConfidence}</strong>
              {ocrConfidence === 'low' && ' - Please review the extracted product names and edit if needed.'}
            </p>
          </div>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 mb-6">
          <h2 className="mb-3 text-lg font-semibold text-zinc-800">Upload Product Image</h2>
          <UploadDropzone onFile={handleFile} isLoading={ocrLoading} />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <h2 className="mb-3 text-lg font-semibold text-zinc-800">Product List</h2>
          <ProductChips value={productChips} onChange={setProductChips} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={!productChips.length || loading}
              className="rounded-full bg-pink-500 px-5 py-2.5 text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Analyze Routine"}
            </button>
          </div>
        </section>

        {results && (
          <div className="space-y-8">
            {/* SCORECARD */}
            <Scorecard
              score={results.routine_rating ? Math.round(
                ((results.routine_rating.barrier_safety || 0) * 20) +
                ((5 - (results.routine_rating.irritation_risk || 0)) * 20) + // Invert irritation risk (lower is better)
                ((results.routine_rating.efficacy || 0) * 20) +
                ((results.routine_rating.compatibility || 0) * 20)
              ) / 4 : 0}
              rationale={results.score_rationale ?? ""}
              factors={[
                { label: "Barrier Safety", value: (results.routine_rating?.barrier_safety || 0) * 20 },
                { label: "Irritation Risk", value: (5 - (results.routine_rating?.irritation_risk || 0)) * 20 }, // Inverted: higher value = lower risk
                { label: "Efficacy", value: (results.routine_rating?.efficacy || 0) * 20 },
                { label: "Compatibility", value: (results.routine_rating?.compatibility || 0) * 20 },
              ]}
            />

            {/* DAILY ROUTINE */}
            {results.routine_plan && (
              <Section title="Daily Routine" subtitle="Use this AM/PM plan and frequencies.">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border bg-white p-5">
                    <Tag tone="success">AM</Tag>
                    <ul className="mt-3 space-y-2 text-neutral-800">{(results.routine_plan.am||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul>
                  </div>
                  <div className="rounded-xl border bg-white p-5">
                    <Tag tone="info">PM</Tag>
                    <ul className="mt-3 space-y-2 text-neutral-800">{(results.routine_plan.pm||[]).map((s:string,i:number)=><li key={i}>• {s}</li>)}</ul>
                  </div>
                </div>
                {results.routine_plan.frequencies && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-neutral-800 mb-2">Frequencies</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {Object.entries(results.routine_plan.frequencies).map(([k,v])=>(
                        <div key={k} className="rounded-lg border bg-white px-3 py-2 text-sm flex flex-col gap-1">
                          <span className="capitalize text-neutral-700 font-medium">{k}</span>
                          <span className="text-neutral-900 text-sm leading-relaxed">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* KEY INSIGHTS */}
            {results?.analysis?.global_observations?.length ? (
              <Section title="Key Insights">
                <ul className="list-disc pl-5 space-y-2 text-neutral-800">
                  {results.analysis.global_observations.map((x:string,i:number)=><li key={i}>{x}</li>)}
                </ul>
              </Section>
            ) : null}

            {/* PRODUCT BREAKDOWN */}
            {results?.products?.length ? (
              <Section title="Product Breakdown" subtitle="Tap to expand details, notes, and citations.">
                <ProductAccordion items={results.products} />
              </Section>
            ) : null}

            {/* PRODUCT INTERACTIONS */}
            {results?.analysis?.pairs?.length ? (
              <Section title="Product Interactions" subtitle="Where conflicts or stacks exist, we show severity.">
                <div className="space-y-4">
                  {results.analysis.pairs.map((p:any, i:number)=>(
                    <div key={i} className="rounded-xl border bg-white p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-[#141822]">{p.between?.join(" + ")}</div>
                        {p.flags?.map((f:any, j:number)=>{
                          const tone = f.severity==="high"?"danger":f.severity==="medium"?"warn":"neutral";
                          return <Tag key={j} tone={tone}>{(f.type||"flag").replaceAll("_"," ")} • {f.severity}</Tag>;
                        })}
                      </div>
                      {p.flags?.length ? <p className="mt-3 text-sm text-neutral-700">{p.flags[0]?.why}</p> : null}
                      {p.suggestions?.length ? (
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-neutral-800 mb-1">Suggestions</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">{p.suggestions.map((s:string,k:number)=><li key={k}>{s}</li>)}</ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* NEXT STEPS */}
            {results?.analysis?.suggestions?.length ? (
              <Section title="Next Steps" subtitle="Actionable tweaks to improve results.">
                <ul className="list-disc pl-5 space-y-2 text-neutral-800">
                  {results.analysis.suggestions.map((s:string,i:number)=><li key={i}>{s}</li>)}
                </ul>
              </Section>
            ) : null}
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
