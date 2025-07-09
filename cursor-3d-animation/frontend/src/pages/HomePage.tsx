import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Code2, Play, Layers } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Generation',
      description: 'Transform natural language prompts into professional 3D animations using advanced AI.',
    },
    {
      icon: Code2,
      title: 'Multiple Libraries',
      description: 'Support for Manim to create mathematical and educational animations.',
    },
    {
      icon: Play,
      title: 'Real-time Preview',
      description: 'See your animations come to life with instant preview and rendering.',
    },
    {
      icon: Layers,
      title: 'Scene Management',
      description: 'Organize and combine multiple scenes into complete animation projects.',
    },
  ];

  const examples = [
    "Create a rotating 3D cube with glowing edges",
    "Visualize a binary search algorithm step by step",
    "Show particle physics simulation with collisions",
    "Animate a DNA double helix structure",
    "Create a 3D solar system with orbiting planets",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered 3D Animation Studio
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Transform your ideas into stunning 3D animations using natural language. 
          No coding required - just describe what you want to create.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/create"
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Start Creating
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link
            to="/scenes"
            className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            View Gallery
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-gray-900" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Example Prompts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Example Animation Prompts
        </h2>
        <div className="space-y-3">
          {examples.map((example, index) => (
            <Link
              key={index}
              to={`/create?prompt=${encodeURIComponent(example)}`}
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
            >
              {example}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-8 mt-16 text-center">
        <div>
          <div className="text-4xl font-bold text-gray-900">1</div>
          <div className="text-gray-600 mt-1">Animation Library</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900">60</div>
          <div className="text-gray-600 mt-1">FPS Rendering</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-gray-900">4K</div>
          <div className="text-gray-600 mt-1">Max Resolution</div>
        </div>
      </div>
    </div>
  );
}