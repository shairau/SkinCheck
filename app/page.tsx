'use client';

import { useState } from 'react';

export default function Home() {
  const [products, setProducts] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const productsArray = products
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (productsArray.length === 0) {
        setError('Please enter at least one product');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: productsArray }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze routine');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Skin Check
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Analyze your skincare routine for compatibility and effectiveness. 
            Get expert insights on product interactions and optimal usage patterns.
          </p>
        </div>

        {/* Form */}
        <div className="bg-pink-pastel rounded-2xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="products" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Skincare Products
              </label>
              <textarea
                id="products"
                value={products}
                onChange={(e) => setProducts(e.target.value)}
                placeholder="Enter your skincare products, one per line:&#10;&#10;Example:&#10;CeraVe Foaming Facial Cleanser&#10;The Ordinary Niacinamide 10% + Zinc 1%&#10;Neutrogena Ultra Sheer Dry-Touch Sunscreen SPF 55"
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-pastel focus:border-transparent resize-none"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter one product per line. Include the full product name for best results.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-pastel hover:bg-green-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze Routine'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Analysis Results
            </h2>
            <pre className="bg-white p-6 rounded-lg overflow-auto text-sm text-gray-800 border border-gray-200">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
