import Link from "next/link"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-50">
      <Navbar />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 text-balance">
            Unlock Your Routine's True Potential
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto text-pretty">
            Discover how well your skincare products work together. Get personalized insights for a healthier skin.
          </p>
          <Link href="/analyze">
            <Button
              size="lg"
              className="bg-gray-800 hover:bg-[#ffd7e0] hover:text-gray-800 text-white px-8 py-3 text-lg rounded-full shadow-lg transition-all duration-300 border-2 border-transparent hover:border-gray-800"
            >
              Analyze Now
            </Button>
          </Link>
        </div>

        <div className="mb-16 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#ffd7e0] rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Smart Analysis</h3>
              <p className="text-gray-600">Advanced algorithms analyze ingredient interactions</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[#cfeee0] rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Personalized Insights</h3>
              <p className="text-gray-600">Tailored recommendations for your unique routine</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#ffd7e0] to-[#cfeee0] rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Healthier Skin</h3>
              <p className="text-gray-600">Optimize your routine for better results</p>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="w-full h-96 rounded-2xl overflow-hidden shadow-xl border-4 border-gradient-to-r from-[#ffd7e0] to-[#cfeee0] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ffd7e0] to-[#cfeee0] p-1 rounded-2xl">
            <div className="w-full h-full rounded-xl overflow-hidden">
              <img
                src="/skincare-products-bottles-serums-moisturizers-on-c.jpg"
                alt="Skincare products arrangement"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
