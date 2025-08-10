import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Echo
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Anonymous peer feedback platform with AI-conducted audio interviews
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Anonymous Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Collect honest, anonymous feedback from colleagues and peers through AI-conducted interviews
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Our AI conducts 15-minute audio interviews, asking thoughtful follow-up questions
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actionable Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Receive comprehensive reports with SMART action items for professional growth
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <Button size="lg" className="mr-4" asChild>
            <a href="/auth/login">Get Started</a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/dashboard">Dashboard</a>
          </Button>
        </div>
      </div>
    </main>
  )
}