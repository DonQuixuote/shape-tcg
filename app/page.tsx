import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Users, Trophy, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="font-playfair text-6xl font-bold text-foreground mb-6 tracking-tight">
              Shape<span className="text-primary">TCG</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              Experience the ultimate trading card game where strategy meets innovation. Battle with AI-powered
              opponents and master the art of tactical gameplay.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/play">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Playing
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg bg-transparent">
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-secondary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/20 rounded-full blur-xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-4xl font-bold text-foreground mb-4">Game Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover what makes ShapeTCG the most engaging trading card experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-border/50 hover:border-primary/50 transition-colors duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-playfair text-xl">AI-Powered Gameplay</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center leading-relaxed">
                  Battle against intelligent AI opponents that adapt to your strategy and provide challenging, dynamic
                  gameplay experiences.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="font-playfair text-xl">Community Battles</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center leading-relaxed">
                  Join a thriving community of players, participate in tournaments, and climb the global leaderboards.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-playfair text-xl">Strategic Depth</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center leading-relaxed">
                  Master complex card interactions, build powerful decks, and develop winning strategies in this deep
                  tactical experience.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-playfair text-4xl font-bold text-foreground mb-6">Ready to Begin Your Journey?</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Join players in the most innovative network wide TCG. Your collection now becomes your army in ShapeTCG.
            </p>
            <Link href="/play">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-10 py-4 text-lg font-semibold"
              >
                <Play className="mr-2 h-5 w-5" />
                Enter the Game
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="font-playfair text-2xl font-bold text-card-foreground mb-4">ShapeTCG</h3>
          <p className="text-muted-foreground">© 2024 ShapeTCG. Experience the future of trading card games.</p>
        </div>
      </footer>
    </div>
  )
}
