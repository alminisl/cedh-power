import {
  BarChart3,
  Database,
  Filter,
  Info,
  Repeat,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Info className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">About cEDH Power Ranker</h1>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <p className="text-sm text-text-muted leading-relaxed">
          Hi, my name is <span className="text-text font-medium">Mons</span> and
          I am the creator of the Pair Challenge Power Rank system. I am not the
          creator of this website — that honor goes to{" "}
          <span className="text-text font-medium">NeoChrome</span>.
        </p>
        <p className="text-sm text-text-muted leading-relaxed">
          This website uses tournament data from cEDH tournaments listed on{" "}
          <span className="text-text font-medium">EDH Top 16</span> to estimate
          how strong different decks are. The goal is to give you an idea of how
          powerful your deck is and maybe even provide some card recommendations.
        </p>
        <p className="text-sm text-text-muted leading-relaxed">
          I have already made several videos about this system on my YouTube
          channel{" "}
          <a
            href="https://www.youtube.com/@cedhtv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light underline font-medium transition-colors"
          >
            cEDH TV
          </a>
          , but here is a written explanation of how it all works.
        </p>
      </div>

      {/* Data Collection */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-accent" />
          Data Collection
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            We collect data from EDH Top 16 by looking at tournament games. What
            we want to know is:
          </p>
          <ul className="text-sm text-text-muted leading-relaxed space-y-1 list-disc list-inside">
            <li>What decklists were played</li>
            <li>Who won the match</li>
          </ul>
          <p className="text-sm text-text-muted leading-relaxed">
            You can see this information yourself by opening any tournament and
            going to the pairings section. There you can scroll through the pods
            and see the players in each match. By clicking on a player's name you
            can open their decklist. You can also see which player won the pod.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            This gives us{" "}
            <span className="text-text font-medium">1 winning decklist</span>{" "}
            and{" "}
            <span className="text-text font-medium">3 losing decklists</span>{" "}
            per pod.
          </p>
        </div>
      </div>

      {/* Exclusions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-accent" />
          Exclusions
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            There are restrictions on which tournaments are included. We only
            collect data from:
          </p>
          <ul className="text-sm text-text-muted leading-relaxed space-y-1 list-disc list-inside">
            <li>
              <span className="text-text font-medium">30+ player</span>{" "}
              tournaments — Top 4
            </li>
            <li>
              <span className="text-text font-medium">60+ player</span>{" "}
              tournaments — Top 16
            </li>
          </ul>
          <p className="text-sm text-text-muted leading-relaxed">
            This means that many games are ignored and only the final rounds are
            included in the dataset.
          </p>

          <h3 className="text-sm font-semibold text-text pt-2">
            Why Only the Top Pods?
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            The goal is to even out player skill. A deck must fight through many
            other decks to reach the top of a large tournament. Because of this,
            we assume that players in the final pods generally have stronger
            decks and better gameplay. By only using these matches, we reduce the
            impact of large skill differences in the data.
          </p>
        </div>
      </div>

      {/* Data Calculation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Swords className="w-5 h-5 text-accent" />
          Data Calculation
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Now we have a match with four decklists of 100 cards each and one
            winning deck. How do we calculate power from this?
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            Instead of ranking individual cards, we rank all possible two-card
            pairs. A deck with 100 cards contains{" "}
            <span className="text-text font-medium">4,950 possible card pairs</span>.
            This is why the system is called{" "}
            <span className="text-accent font-semibold">
              Pair Challenge Power Rank
            </span>
            .
          </p>

          <h3 className="text-sm font-semibold text-text pt-2">
            Pair Challenges
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            Each pair from the winning deck is challenged against all pairs from
            the losing decks. Each challenge is essentially{" "}
            <span className="text-text font-medium">2 cards vs 2 cards</span>.
            If the pair comes from the winning deck, it receives 1 win in that
            challenge.
          </p>

          <h3 className="text-sm font-semibold text-text pt-2">
            Important Exclusion
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            If both decks contain the same pair, that matchup is ignored.
          </p>
          <div className="bg-bg/50 rounded-lg p-3 text-xs text-text-muted font-mono space-y-1">
            <p>Winner pair: Sol Ring + Island</p>
            <p>Loser pair: Sol Ring + Island</p>
            <p className="text-text-muted italic pt-1">
              Same pair → matchup excluded
            </p>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            However, the pair may still challenge pairs from the other losing
            decks.
          </p>

          <h3 className="text-sm font-semibold text-text pt-2">
            Mirror Matches
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            If the decks in the pod share many cards, there will be fewer pair
            challenges. If the decks are very different, there will be many more.
            In general, a single pod produces roughly{" "}
            <span className="text-text font-medium">
              20 million to 60 million pair challenges
            </span>
            .
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Results
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            After processing the challenges we get records like this:
          </p>
          <div className="bg-bg/50 rounded-lg p-3 text-xs text-text-muted font-mono space-y-1">
            <p>Sol Ring + Island vs Sol Ring + Mountain</p>
            <p>Result: 0 / 1</p>
            <p className="text-text-muted italic pt-1">
              Sol Ring + Mountain won 1 out of 1 games
            </p>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Over time we might instead get a record like:
          </p>
          <div className="bg-bg/50 rounded-lg p-3 text-xs text-text-muted font-mono space-y-1">
            <p>Sol Ring + Island → 78 wins</p>
            <p>Sol Ring + Mountain → 66 wins</p>
            <p className="pt-1">Sol Ring + Island → 54% winrate</p>
            <p>Sol Ring + Mountain → 46% winrate</p>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            You can think of the system as a massive free-for-all tournament
            where all possible two-card pairs join forces and repeatedly battle
            other pairs. Over thousands or millions of interactions we observe
            how well each pair performs against the total pool of cards that
            appear in tournaments.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            This produces an overall winrate for every two-card pair, based on
            how they performed against all other pairs in the tournament dataset.
          </p>
        </div>
      </div>

      {/* Website Function */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          How the Website Works
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            When you submit your decklist to the website:
          </p>
          <ol className="text-sm text-text-muted leading-relaxed space-y-1 list-decimal list-inside">
            <li>
              The system generates all{" "}
              <span className="text-text font-medium">4,950 pairs</span> from
              your 100 cards.
            </li>
            <li>
              Each pair already has a power rating based on tournament data.
            </li>
            <li>
              The website calculates the{" "}
              <span className="text-text font-medium">average pair power</span>{" "}
              across your entire deck.
            </li>
          </ol>
          <p className="text-sm text-text-muted leading-relaxed">
            This gives your deck its{" "}
            <span className="text-accent font-semibold">Pair Power Rank</span>.
          </p>
        </div>
      </div>

      {/* Swapping Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Repeat className="w-5 h-5 text-accent" />
          Swapping Cards
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            If you replace a single card in your deck, the system changes:
          </p>
          <ul className="text-sm text-text-muted leading-relaxed space-y-1 list-disc list-inside">
            <li>
              <span className="text-text font-medium">99 old pairs</span> are
              removed
            </li>
            <li>
              <span className="text-text font-medium">99 new pairs</span> are
              added
            </li>
          </ul>
          <p className="text-sm text-text-muted leading-relaxed">
            This produces a new overall power rank, allowing you to experiment
            with different card replacements.
          </p>
        </div>
      </div>

      {/* Synergy */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Synergy
        </h2>

        <div className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            The system naturally captures card synergy. For example:
          </p>
          <div className="bg-bg/50 rounded-lg p-3 text-xs text-text-muted font-mono space-y-1">
            <p>Voltaic Key + The One Ring → strong winrate</p>
            <p>Voltaic Key + Command Tower → weaker winrate</p>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Voltaic Key is a decent card on its own, but it becomes much stronger
            when paired with The One Ring. This means your cards are evaluated
            based on both:
          </p>
          <ul className="text-sm text-text-muted leading-relaxed space-y-1 list-disc list-inside">
            <li>Individual card strength</li>
            <li>How well they synergize with other cards in your deck</li>
          </ul>
        </div>
      </div>

      {/* Limitations */}
      <div className="glass rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold">Limitations</h2>
        <ul className="text-xs text-text-muted leading-relaxed space-y-2 list-disc list-inside">
          <li>
            The dataset is still growing — many card pairs don't have data yet
            and fall back to a default power score. This means niche or new cards
            may not be accurately represented.
          </li>
          <li>
            Cards with alternative printings or names (e.g. Secret Lair
            versions) may not match the names in the dataset. We're working on
            an alias system.
          </li>
          <li>
            Decks with duplicate basic lands (e.g. 10 Mountains) are supported —
            each copy generates pairs with every other card, keeping the total at
            4,950 pairs for fair comparison.
          </li>
        </ul>
      </div>

      {/* Credits */}
      <div className="glass rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Credits
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">
          Pair Challenge Power Rank system created by{" "}
          <span className="text-text font-medium">Mons</span> (cEDH TV).
          Tournament data curated by{" "}
          <span className="text-text font-medium">MicroMonkey</span>. Website
          built by <span className="text-text font-medium">NeoChrome</span>.
          Card images provided by Scryfall.
        </p>
      </div>
    </main>
  );
}
