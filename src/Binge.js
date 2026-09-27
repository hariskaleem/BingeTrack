import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tv,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  Clock,
  Search,
  Users,
  Star,
  Bell,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  BookmarkCheck,
  Code2,
  Menu,
  X,
  Plus,
  Trash2,
  Film,
  UserCircle,
  LogOut,
} from "lucide-react";
import "./binge.css";

const TMDB_KEY = "1cc521499397d3f05045034cd080066b";
const TMDB_BASE = "https://api.themoviedb.org/3";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const TMDB_IMG = "https://image.tmdb.org/t/p/w400";
const FALLBACK = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80";

function mapStatus(s) {
  if (!s) return "Plan to Watch";
  if (s === "Returning Series") return "Watching";
  if (s === "Ended" || s === "Canceled") return "Completed";
  return "Plan to Watch";
}
function fmtRuntime(m) {
  return m ? m + "m" : "N/A";
}
function fmtEp(s, e) {
  return "S" + String(s).padStart(2, "0") + "E" + String(e).padStart(2, "0");
}
function episodeSeason(ep) {
  if (ep.season) return ep.season;
  const match = /^s(\d+)/i.exec(ep.id || "");
  return match ? Number(match[1]) : 1;
}
function isEpisodeReleased(ep) {
  if (!ep.airDate) return true;
  return new Date(ep.airDate + "T23:59:59") <= new Date();
}
function formatAirDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatWatchTime(minutes) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? hours + "h " + remainingMinutes + "m" : remainingMinutes + "m";
}
function showProgress(show) {
  const watched = show.episodes.filter((ep) => ep.watched).length;
  const total = show.totalEpisodes || show.episodes.length;
  return {
    watched,
    total,
    percent: total ? Math.round((watched / total) * 100) : 0,
  };
}
function showStatus(show) {
  const { watched, total } = showProgress(show);
  const loadedSeasons = new Set(show.episodes.map(episodeSeason)).size;
  const hasCompleteEpisodeData = show.totalEpisodes || loadedSeasons >= (show.totalSeasons || 1);
  if (total > 0 && watched === total && hasCompleteEpisodeData) return "Completed";
  if (watched > 0) return "Watching";
  return "Plan to Watch";
}

const FEATURES = [
  {
    tone: "v",
    icon: BookmarkCheck,
    title: "Zero-Friction Tracking",
    text: "Mark individual episodes, entire seasons, or series in a single tap with instant optimistic UI.",
  },
  {
    tone: "c",
    icon: Calendar,
    title: "Release Calendars",
    text: "Customized calendar showing premiere dates and weekly episodes tailored to your queue.",
  },
  {
    tone: "f",
    icon: BarChart3,
    title: "Deep Telemetry & Stats",
    text: "Discover total watch hours, your top networks, and yearly binge velocity charts.",
  },
  {
    tone: "e",
    icon: Users,
    title: "Social Friend Feeds",
    text: "Follow friends in real time to see what they are watching without spoilers.",
  },
];

export default function App() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [filterQuery, setFilterQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [selSeason, setSelSeason] = useState(1);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [recommendationApiPage, setRecommendationApiPage] = useState(0);
  const [recommendationHasMore, setRecommendationHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem("bingetrack_token")));
  const [username] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bingetrack_user") || "{}").username || "Account";
    } catch {
      return "Account";
    }
  });
  const debRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("bingetrack_token");
    localStorage.removeItem("bingetrack_user");
    setIsAuthenticated(false);
    setShows([]);
    setSelectedShowId(null);
    setMobileOpen(false);
  };

  const saveShows = async (nextShows) => {
    const token = localStorage.getItem("bingetrack_token");
    if (!token) return;

    const response = await fetch(`${API_URL}/api/me/shows`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ shows: nextShows }),
    });
    if (!response.ok) throw new Error("Failed to save your watchlist");
  };

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const token = localStorage.getItem("bingetrack_token");
    if (!token || !isAuthenticated) return;

    fetch(`${API_URL}/api/me/shows`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load your watchlist");
        return response.json();
      })
      .then((data) => {
        setShows(data.shows || []);
        setSelectedShowId(data.shows && data.shows[0] ? data.shows[0].id : null);
      })
      .catch(() => notify("Could not load your saved shows."));
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    fetch(TMDB_BASE + "/tv/top_rated?api_key=" + TMDB_KEY + "&language=en-US&page=1")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load recommendations");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const nextRecommendations = (data.results || [])
          .filter((show) => show.poster_path && show.name)
          .sort((first, second) => (second.vote_average || 0) - (first.vote_average || 0))
          .map((show) => ({
            id: show.id,
            title: show.name,
            year: show.first_air_date ? show.first_air_date.slice(0, 4) : "N/A",
            episodes: "Trending now",
            genre: show.origin_country?.[0] || "TV Series",
            rating: show.vote_average ? show.vote_average.toFixed(1) : "N/A",
            poster: TMDB_IMG + show.poster_path,
          }));
        setRecommendations(nextRecommendations);
        setRecommendationApiPage(1);
        setRecommendationHasMore(1 < (data.total_pages || 1));
        setRecommendationPage(0);
      })
      .catch(() => {
        if (!cancelled) notify("Could not load recommendations.");
      })
      .finally(() => {
        if (!cancelled) setRecommendationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!tmdbQuery.trim()) {
      setTmdbResults([]);
      return;
    }
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          TMDB_BASE +
            "/search/tv?api_key=" +
            TMDB_KEY +
            "&query=" +
            encodeURIComponent(tmdbQuery) +
            "&language=en-US&page=1",
        );
        const d = await r.json();
        setTmdbResults(d.results ? d.results.slice(0, 8) : []);
      } catch {
        notify("Search failed — check your connection.");
      } finally {
        setSearching(false);
      }
    }, 380);
    return () => clearTimeout(debRef.current);
  }, [tmdbQuery]);

  function buildEps(rawEps, seasonNum, fallback) {
    if (!rawEps || !rawEps.length) {
      return [
        { id: "s" + seasonNum + "e1", num: fmtEp(seasonNum, 1), title: "Episode 1", watched: false, duration: "N/A" },
      ];
    }
    return rawEps.map((ep) => ({
      id: "s" + seasonNum + "e" + ep.episode_number,
      season: seasonNum,
      num: fmtEp(seasonNum, ep.episode_number),
      title: ep.name || "Episode " + ep.episode_number,
      airDate: ep.air_date || null,
      watched: false,
      duration: fmtRuntime(ep.runtime || fallback),
    }));
  }

  const handleAddShow = async (tmdbShow) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (shows.find((s) => s.tmdbId === tmdbShow.id)) {
      notify(tmdbShow.name + " is already in your list!");
      return;
    }
    setAddingId(tmdbShow.id);
    try {
      const detailRes = await fetch(TMDB_BASE + "/tv/" + tmdbShow.id + "?api_key=" + TMDB_KEY + "&language=en-US");
      const detail = await detailRes.json();
      const fallbackRuntime = detail.episode_run_time && detail.episode_run_time[0];
      const totalSeasons = detail.number_of_seasons || 1;
      const totalEpisodes = (detail.seasons || [])
        .filter((season) => season.season_number > 0)
        .reduce((count, season) => count + (season.episode_count || 0), 0);
      const seasonResponses = await Promise.all(
        Array.from({ length: totalSeasons }, (_, index) =>
          fetch(
            TMDB_BASE + "/tv/" + tmdbShow.id + "/season/" + (index + 1) + "?api_key=" + TMDB_KEY + "&language=en-US",
          ),
        ),
      );
      const seasons = await Promise.all(seasonResponses.map((response) => response.json()));
      const episodes = seasons.flatMap((season, index) => buildEps(season.episodes || [], index + 1, fallbackRuntime));
      const newShow = {
        id: "tmdb-" + tmdbShow.id,
        tmdbId: tmdbShow.id,
        title: detail.name,
        network: detail.networks && detail.networks[0] ? detail.networks[0].name : "Unknown",
        poster: detail.poster_path ? TMDB_IMG + detail.poster_path : FALLBACK,
        backdrop: detail.backdrop_path ? "https://image.tmdb.org/t/p/w780" + detail.backdrop_path : null,
        status: mapStatus(detail.status),
        rating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : 0,
        nextAir: detail.next_episode_to_air
          ? "Next: " + detail.next_episode_to_air.air_date
          : detail.status === "Ended"
            ? "Series Ended"
            : "TBA",
        genres: (detail.genres || []).slice(0, 3).map((g) => g.name),
        episodes,
        overview: detail.overview || "",
        totalSeasons,
        totalEpisodes: totalEpisodes || episodes.length,
        loadedSeason: 1,
      };
      const nextShows = [newShow, ...shows];
      setShows(nextShows);
      await saveShows(nextShows);
      setSelectedShowId(newShow.id);
      setSelSeason(1);
      setPanelOpen(false);
      setTmdbQuery("");
      setTmdbResults([]);
      notify("Added " + detail.name + " to your watchlist!");
    } catch (error) {
      notify(
        error.message === "Failed to save your watchlist"
          ? "Could not save your watchlist."
          : "Failed to fetch show details. Try again.",
      );
    } finally {
      setAddingId(null);
    }
  };

  const handleLoadSeason = async (show, seasonNum) => {
    setSeasonLoading(true);
    setSelSeason(seasonNum);
    try {
      const r = await fetch(
        TMDB_BASE + "/tv/" + show.tmdbId + "/season/" + seasonNum + "?api_key=" + TMDB_KEY + "&language=en-US",
      );
      const season = await r.json();
      const nextShows = shows.map((savedShow) => {
        if (savedShow.id !== show.id) return savedShow;
        const previousEpisodes = savedShow.episodes || [];
        const previousSeasonEpisodes = new Map(
          previousEpisodes.filter((ep) => episodeSeason(ep) === seasonNum).map((ep) => [ep.id, ep]),
        );
        const loadedEpisodes = buildEps(season.episodes || [], seasonNum, null).map((ep) => ({
          ...ep,
          watched: previousSeasonEpisodes.get(ep.id)?.watched || false,
        }));
        return {
          ...savedShow,
          episodes: [...previousEpisodes.filter((ep) => episodeSeason(ep) !== seasonNum), ...loadedEpisodes],
          loadedSeason: seasonNum,
        };
      });
      setShows(nextShows);
      saveShows(nextShows).catch(() => notify("Could not save your season progress."));
    } catch {
      notify("Failed to load season.");
    } finally {
      setSeasonLoading(false);
    }
  };

  const handleRemove = (showId) => {
    const nextShows = shows.filter((s) => s.id !== showId);
    setShows(nextShows);
    if (selectedShowId === showId) setSelectedShowId(nextShows[0] ? nextShows[0].id : null);
    saveShows(nextShows).catch(() => notify("Could not save that change."));
    notify("Show removed from your list.");
  };

  const handleRecommendationSearch = (title) => {
    setPanelOpen(true);
    setTmdbQuery(title);
    document.getElementById("interactive-demo")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleHomeNavigation = (event) => {
    event.preventDefault();
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextRecommendationPage = async () => {
    if (recommendationLoading) return;
    if (recommendationPage < recommendationPageCount - 1) {
      setRecommendationPage((page) => page + 1);
      return;
    }
    if (!recommendationHasMore) return;

    setRecommendationLoading(true);
    try {
      const nextApiPage = recommendationApiPage + 1;
      const response = await fetch(
        TMDB_BASE + "/tv/top_rated?api_key=" + TMDB_KEY + "&language=en-US&page=" + nextApiPage,
      );
      if (!response.ok) throw new Error("Failed to load more recommendations");
      const data = await response.json();
      const nextRecommendations = (data.results || [])
        .filter((show) => show.poster_path && show.name)
        .map((show) => ({
          id: show.id,
          title: show.name,
          year: show.first_air_date ? show.first_air_date.slice(0, 4) : "N/A",
          episodes: "Top rated",
          genre: show.origin_country?.[0] || "TV Series",
          rating: show.vote_average ? show.vote_average.toFixed(1) : "N/A",
          poster: TMDB_IMG + show.poster_path,
        }));
      setRecommendations((current) => {
        const existingIds = new Set(current.map((show) => show.id));
        return [...current, ...nextRecommendations.filter((show) => !existingIds.has(show.id))];
      });
      setRecommendationApiPage(nextApiPage);
      setRecommendationHasMore(nextApiPage < (data.total_pages || nextApiPage));
      const currentPageIsPartial = recommendations.length % recommendationPageSize !== 0;
      setRecommendationPage((page) => (currentPageIsPartial ? page : page + 1));
    } catch {
      notify("Could not load more recommendations.");
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleToggleEp = (showId, epId) => {
    const nextShows = shows.map((show) =>
      show.id !== showId
        ? show
        : {
            ...show,
            episodes: show.episodes.map((ep) =>
              ep.id === epId && isEpisodeReleased(ep) ? { ...ep, watched: !ep.watched } : ep,
            ),
          },
    );
    setShows(nextShows);
    saveShows(nextShows).catch(() => notify("Could not save your progress."));
    notify("Progress updated!");
  };

  const filteredShows = useMemo(() => {
    const q = filterQuery.toLowerCase();
    return shows.filter((s) => {
      const okSearch = s.title.toLowerCase().includes(q) || s.genres.some((g) => g.toLowerCase().includes(q));
      const okTab = activeTab === "All" || showStatus(s) === activeTab;
      return okSearch && okTab;
    });
  }, [shows, filterQuery, activeTab]);

  const activeShow = shows.find((s) => s.id === selectedShowId) || shows[0] || null;
  const sortedRecommendations = recommendations;
  const recommendationPageSize = 8;
  const recommendationPageCount = Math.max(1, Math.ceil(sortedRecommendations.length / recommendationPageSize));
  const visibleRecommendations = sortedRecommendations.slice(
    recommendationPage * recommendationPageSize,
    (recommendationPage + 1) * recommendationPageSize,
  );
  const activeProgress = activeShow ? showProgress(activeShow) : { watched: 0, total: 0, percent: 0 };
  const visibleEpisodes = activeShow
    ? activeShow.episodes.filter((episode) => episodeSeason(episode) === selSeason)
    : [];
  const upcomingShows = shows
    .map((show) => {
      const episode = show.episodes
        .filter((candidate) => candidate.airDate && !candidate.watched && !isEpisodeReleased(candidate))
        .sort((first, second) => first.airDate.localeCompare(second.airDate))[0];
      return episode ? { show, episode } : null;
    })
    .filter(Boolean);
  const watchStats = shows.reduce(
    (stats, show) => ({
      watchedShows: stats.watchedShows + (show.episodes.some((episode) => episode.watched) ? 1 : 0),
      watchedEpisodes: stats.watchedEpisodes + show.episodes.filter((episode) => episode.watched).length,
      watchedSeasons:
        stats.watchedSeasons + new Set(show.episodes.filter((episode) => episode.watched).map(episodeSeason)).size,
      watchedMinutes:
        stats.watchedMinutes +
        show.episodes
          .filter((episode) => episode.watched)
          .reduce((minutes, episode) => {
            const runtime = Number.parseInt(episode.duration, 10);
            return minutes + (Number.isNaN(runtime) ? 0 : runtime);
          }, 0),
    }),
    { watchedShows: 0, watchedEpisodes: 0, watchedSeasons: 0, watchedMinutes: 0 },
  );
  return (
    <div className="page">
      <div className="ambient">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="dots" />
      </div>

      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">
              <Tv />
              <span className="logo-ping" />
            </div>
            <div>
              <span className="logo-name">
                Binge<span className="gradient-text">Track</span>
              </span>
              <span className="logo-tag">Live TV Tracking Engine</span>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#hero" onClick={handleHomeNavigation}>
              Home
            </a>
            <a href="#interactive-demo">Tracker</a>
            <a href="#recommendations">Recommendations</a>
            <a href="#features">Features</a>
            <a href="#stats">Reviews</a>
          </nav>
          <div className="nav-cta">
            {isAuthenticated ? (
              <>
                <span className="account-icon" title="Signed in">
                  <UserCircle size={22} aria-hidden="true" />
                  <span className="sr-only">Signed in</span>
                </span>
                <button
                  type="button"
                  className="account-icon logout-button"
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out">
                  <LogOut size={22} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
          <button className="menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="mobile-menu">
            <a href="#hero" onClick={handleHomeNavigation}>
              Home
            </a>
            <a href="#interactive-demo" onClick={() => setMobileOpen(false)}>
              Tracker
            </a>
            <a href="#recommendations" onClick={() => setMobileOpen(false)}>
              Recommendations
            </a>
            <a href="#features" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#stats" onClick={() => setMobileOpen(false)}>
              Reviews
            </a>
            {isAuthenticated ? (
              <>
                <span className="mobile-account">
                  <UserCircle size={20} aria-hidden="true" />
                  {username}
                </span>
                <button
                  type="button"
                  className="account-icon mobile-logout"
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out">
                  <LogOut size={20} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="outline" onClick={() => setMobileOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" className="solid" onClick={() => setMobileOpen(false)}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <section id="hero" className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="pill">
              <Sparkles />
              <span>Live TV catalog &bull; 500,000+ shows</span>
            </div>
            <h1>
              Track every episode. <span className="gradient-text wide">Never lose your place again.</span>
            </h1>
            <p className="lead">
              Search 500,000+ TV shows, add them to your tracker, mark episodes watched, and follow release schedules in
              one cinema-grade dashboard.
            </p>
            <div className="hero-actions">
              <a href="#interactive-demo" className="btn-primary lg">
                <span>Track Your Shows</span>
                <ArrowRight size={16} />
              </a>
              <a href="#features" className="btn-secondary">
                <Code2 size={16} />
                <span>See Features</span>
              </a>
            </div>
            <div className="trust">
              <div className="g">
                <ShieldCheck />
                <span>Free forever plan</span>
              </div>
              <div className="c">
                <Zap />
                <span>Sub-50ms React state</span>
              </div>
              <div className="v">
                <Bell />
                <span>Instant air notifications</span>
              </div>
            </div>
          </div>
          <div className="mockup-wrap">
            <div className="mockup-glow" />
            <div className="mockup">
              <div className="mockup-bar">
                <div className="dots-row">
                  <span className="dot r" />
                  <span className="dot a" />
                  <span className="dot g" />
                </div>
                <div className="mock-status">
                  <span className="live">
                    <i />
                    Live Sync
                  </span>
                </div>
              </div>
              <div className="mockup-body">
                <div className="card">
                  <div className="airing-head">
                    <div>
                      <span className="eyebrow">Upcoming Shows</span>
                      <h3>{upcomingShows.length ? "What's Coming Up" : "No Upcoming Episodes"}</h3>
                    </div>
                    <span className="badge">Live Updates</span>
                  </div>
                  <div className="airing-body">
                    <div className="upcoming-list">
                      {upcomingShows.length ? (
                        upcomingShows.map(({ show, episode }) => (
                          <div className="upcoming-item" key={show.id + "-" + episode.id}>
                            <img src={show.poster} alt={show.title} />
                            <div>
                              <strong>{show.title}</strong>
                              <span>
                                {episode.num} · {episode.title}
                              </span>
                            </div>
                            <time dateTime={episode.airDate}>{formatAirDate(episode.airDate)}</time>
                          </div>
                        ))
                      ) : (
                        <em>
                          {shows.length
                            ? "Every saved episode is watched or already released."
                            : "Search the catalog to plan your next show."}
                        </em>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card stats-card">
                  <div className="stats-card-heading">
                    <span className="eyebrow" style={{ color: "var(--muted)" }}>
                      Your Watch Data
                    </span>
                    <span className="stats-live">
                      <i /> Live watched data
                    </span>
                  </div>
                  <div className="watch-stat-grid">
                    <div className="watch-stat violet">
                      <Tv />
                      <strong>{watchStats.watchedShows}</strong>
                      <span>Watched Shows</span>
                    </div>
                    <div className="watch-stat cyan">
                      <Film />
                      <strong>{watchStats.watchedEpisodes}</strong>
                      <span>Watched Episodes</span>
                    </div>
                    <div className="watch-stat emerald">
                      <Calendar />
                      <strong>{watchStats.watchedSeasons}</strong>
                      <span>Watched Seasons</span>
                    </div>
                  </div>
                  <div className="watch-runtime">
                    <Clock />
                    <div>
                      <span>Time watched</span>
                      <strong>{formatWatchTime(watchStats.watchedMinutes)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recommendations" className="recommendations" aria-labelledby="recommended-title">
        <div className="container">
          <div className="recommendations-head">
            <div>
              <span className="eyebrow violet">Curated for your next binge</span>
              <h2 id="recommended-title">Recommended</h2>
            </div>
            <div className="recommendations-actions">
              <span className="recommendations-sort">Top rated</span>
              <button
                className="recommendation-nav"
                onClick={() => setRecommendationPage((page) => Math.max(0, page - 1))}
                disabled={recommendationPage === 0}
                aria-label="Previous recommendations">
                <ArrowRight size={16} className="previous-icon" />
              </button>
              <button
                className="recommendation-nav"
                onClick={handleNextRecommendationPage}
                disabled={
                  recommendationLoading ||
                  (!recommendationHasMore && recommendationPage === recommendationPageCount - 1)
                }
                aria-label="Next recommendations">
                {recommendationLoading ? <span className="recommendation-spinner" /> : <ArrowRight size={16} />}
              </button>
            </div>
          </div>
          <div className="recommendations-rail">
            {recommendationLoading ? (
              <div className="recommendations-status">Loading recommendations...</div>
            ) : (
              visibleRecommendations.map((show) => (
                <button
                  className="recommendation-card"
                  key={show.id}
                  onClick={() => handleRecommendationSearch(show.title)}
                  aria-label={`Search for ${show.title}`}>
                  <span className="recommendation-poster">
                    <img
                      src={show.poster}
                      alt={`${show.title} poster`}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK;
                      }}
                    />
                    <span
                      className="recommendation-overlay"
                      role="button"
                      tabIndex="0"
                      aria-label={`Add ${show.title} to your playlist`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddShow({ id: show.id, name: show.title });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          handleAddShow({ id: show.id, name: show.title });
                        }
                      }}>
                      <span>{addingId === show.id ? "Adding..." : "Add show"}</span>
                      {addingId === show.id ? <span className="recommendation-spinner" /> : <Plus size={16} />}
                    </span>
                    <span className="recommendation-rating">
                      <Star size={11} /> {show.rating}
                    </span>
                  </span>
                  <span className="recommendation-info">
                    <strong>{show.title}</strong>
                    <span>
                      {show.year} <i /> {show.episodes}
                    </span>
                    <small>{show.genre}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="interactive-demo" className="section alt both">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Live TV Tracker</span>
            <h2>Search, Add &amp; Track Any TV Show</h2>
            <p>Search 500,000+ shows with real posters, episode lists, and ratings. No manual data entry.</p>
          </div>

          {toast && (
            <div className="toast">
              <Sparkles />
              <span>{toast}</span>
            </div>
          )}

          <div className="tracker">
            <div className="tracker-top">
              <div className="tabs">
                {["All", "Watching", "Plan to Watch", "Completed"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={"tab" + (activeTab === tab ? " active" : "")}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="tracker-controls">
                <div className="search">
                  <Search />
                  <input
                    type="text"
                    placeholder="Filter your list..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>
                <button className="btn-add-show" onClick={() => setPanelOpen(!panelOpen)}>
                  <Plus size={15} />
                  Add Show
                </button>
              </div>
            </div>

            {panelOpen && (
              <div className="add-panel">
                <div className="add-panel-header">
                  <span className="add-panel-title">
                    <Film size={16} />
                    Search Shows
                  </span>
                  <button
                    className="close-panel-btn"
                    onClick={() => {
                      setPanelOpen(false);
                      setTmdbQuery("");
                      setTmdbResults([]);
                    }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="search add-search">
                  <Search />
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Breaking Bad, Game of Thrones, Severance..."
                    value={tmdbQuery}
                    onChange={(e) => setTmdbQuery(e.target.value)}
                  />
                  {searching && <span className="spin-loader" />}
                </div>
                {!tmdbQuery && <p className="add-panel-hint">Start typing to search over 500,000+ TV shows</p>}
                {tmdbQuery && !searching && tmdbResults.length === 0 && (
                  <div className="empty">No results found for "{tmdbQuery}"</div>
                )}
                {tmdbResults.length > 0 && (
                  <div className="tmdb-results">
                    {tmdbResults.map((show) => {
                      const alreadyAdded = !!shows.find((s) => s.tmdbId === show.id);
                      const isAdding = addingId === show.id;
                      return (
                        <div key={show.id} className="tmdb-result-card">
                          <img src={show.poster_path ? TMDB_IMG + show.poster_path : FALLBACK} alt={show.name} />
                          <div className="tmdb-result-info">
                            <h5>{show.name}</h5>
                            <div className="tmdb-result-meta">
                              <span>{show.first_air_date ? show.first_air_date.slice(0, 4) : "N/A"}</span>
                              <span className="tmdb-rating">
                                <Star size={11} />
                                {show.vote_average ? show.vote_average.toFixed(1) : "N/A"}
                              </span>
                            </div>
                            <p className="tmdb-overview">
                              {show.overview
                                ? show.overview.length > 110
                                  ? show.overview.slice(0, 110) + "..."
                                  : show.overview
                                : "No description available."}
                            </p>
                          </div>
                          <button
                            className={"btn-add-result" + (alreadyAdded ? " added" : "")}
                            disabled={isAdding || alreadyAdded}
                            onClick={() => handleAddShow(show)}>
                            {isAdding ? (
                              <span className="spin-loader sm" />
                            ) : alreadyAdded ? (
                              "Added"
                            ) : (
                              <>
                                <Plus size={13} />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="tracker-grid">
              <div className="show-list">
                <div className="list-label">
                  Watchlist ({filteredShows.length} show{filteredShows.length !== 1 ? "s" : ""})
                </div>
                {shows.length === 0 ? (
                  <div className="empty-watchlist">
                    <div className="empty-watchlist-icon">
                      <Tv size={36} />
                    </div>
                    <p>Your watchlist is empty</p>
                    <span>Search the catalog to discover and add shows</span>
                    <button className="btn-add-show" onClick={() => setPanelOpen(true)}>
                      <Plus size={14} />
                      Search Shows
                    </button>
                  </div>
                ) : filteredShows.length === 0 ? (
                  <div className="empty">No shows match your filter.</div>
                ) : (
                  filteredShows.map((show) => {
                    const { watched, total, percent } = showProgress(show);
                    return (
                      <div
                        key={show.id}
                        onClick={() => {
                          setSelectedShowId(show.id);
                          setSelSeason(show.loadedSeason || 1);
                        }}
                        className={"show-card" + (activeShow && show.id === activeShow.id ? " selected" : "")}>
                        <img src={show.poster} alt={show.title} />
                        <div className="show-body">
                          <div className="show-title-row">
                            <h4>{show.title}</h4>
                            <span className="rating">
                              <Star />
                              {show.rating}
                            </span>
                          </div>
                          <div className="show-meta">
                            <span>{show.network}</span>
                            <span>&bull;</span>
                            <span className="status">{showStatus(show)}</span>
                          </div>
                          <div className="mini-progress">
                            <div className="row-between">
                              <span>
                                Ep {watched}/{total}
                              </span>
                              <span className="mono">{percent}%</span>
                            </div>
                            <div className="progress sm">
                              <div style={{ width: percent + "%" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {activeShow ? (
                <div className="detail">
                  {activeShow.backdrop && (
                    <div className="detail-backdrop" style={{ backgroundImage: "url(" + activeShow.backdrop + ")" }} />
                  )}
                  <div className="detail-inner">
                    <div className="detail-head">
                      <div>
                        <div className="detail-title">
                          <h3>{activeShow.title}</h3>
                          <span className="chip">{activeShow.network}</span>
                        </div>
                        <p className="detail-sub">
                          {activeShow.genres.join(", ")} &bull; <b>{activeShow.nextAir}</b>
                        </p>
                        {activeShow.overview && (
                          <p className="detail-overview">
                            {activeShow.overview.length > 160
                              ? activeShow.overview.slice(0, 160) + "..."
                              : activeShow.overview}
                          </p>
                        )}
                      </div>
                      <div className="completion">
                        <span>Completion</span>
                        <strong>{activeProgress.percent}%</strong>
                      </div>
                    </div>
                    <div className="progress big">
                      <div style={{ width: activeProgress.percent + "%" }} />
                    </div>

                    {activeShow.totalSeasons > 1 && (
                      <div className="season-selector">
                        <span className="season-label">Season</span>
                        <div className="season-pills">
                          {Array.from({ length: activeShow.totalSeasons }, (_, i) => i + 1).map((s) => (
                            <button
                              key={s}
                              disabled={seasonLoading}
                              onClick={() => handleLoadSeason(activeShow, s)}
                              className={"season-pill" + (selSeason === s ? " active" : "")}>
                              {s}
                            </button>
                          ))}
                        </div>
                        {seasonLoading && <span className="spin-loader sm" />}
                      </div>
                    )}

                    <div className="ep-header">
                      <span>Released episodes can be marked watched</span>
                      <span>Runtime</span>
                    </div>
                    <div className="ep-list">
                      {visibleEpisodes.map((ep) => (
                        <div
                          key={ep.id}
                          onClick={isEpisodeReleased(ep) ? () => handleToggleEp(activeShow.id, ep.id) : undefined}
                          aria-disabled={!isEpisodeReleased(ep)}
                          className={
                            "episode" + (ep.watched ? " watched" : "") + (!isEpisodeReleased(ep) ? " unreleased" : "")
                          }>
                          <div className="ep-left">
                            {ep.watched ? <CheckCircle2 /> : <Circle />}
                            <div>
                              <span className="ep-num">{ep.num}</span>
                              <span className="ep-title">{ep.title}</span>
                            </div>
                          </div>
                          <span className="ep-time">
                            {isEpisodeReleased(ep) ? (
                              <>
                                <Clock />
                                {ep.duration}
                              </>
                            ) : (
                              "Not released"
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="detail-foot">
                    <span>
                      <Zap />
                      Live episode data
                    </span>
                    <div className="detail-foot-actions">
                      <button
                        className="link-btn"
                        onClick={() => {
                          const visibleEpisodeIds = new Set(visibleEpisodes.map((episode) => episode.id));
                          const nextShows = shows.map((show) =>
                            show.id !== activeShow.id
                              ? show
                              : {
                                  ...show,
                                  episodes: show.episodes.map((episode) =>
                                    visibleEpisodeIds.has(episode.id) && isEpisodeReleased(episode)
                                      ? { ...episode, watched: true }
                                      : episode,
                                  ),
                                },
                          );
                          setShows(nextShows);
                          saveShows(nextShows).catch(() => notify("Could not save your progress."));
                          notify("Marked all " + activeShow.title + " episodes watched!");
                        }}>
                        Mark All Watched
                      </button>
                      <button className="link-btn danger" onClick={() => handleRemove(activeShow.id)}>
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail detail-empty">
                  <Film size={48} />
                  <p>Select a show to view episodes</p>
                  <span>Or add a show using the search above</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="section-head wide">
            <span className="eyebrow violet">Engineered for Binge Watchers</span>
            <h2>Everything You Need to Command Your Watchlist</h2>
            <p>No more opening four different streaming platforms to find where you left off.</p>
          </div>
          <div className="grid-4">
            {FEATURES.map(({ tone, icon: Icon, title, text }) => (
              <div key={title} className={"feature " + tone}>
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" className="section c">
        <div className="container">
          <div className="stats-grid">
            <div className="stats-copy">
              <span className="eyebrow violet">Loved by TV Buffs</span>
              <h2>Join 120,000+ Viewers Organizing Their Television Life</h2>
              <p>
                From anime fanatics to prestige drama completionists, BingeTrack keeps everyone on the exact minute of
                their favorite series.
              </p>
              <div className="stats-nums">
                <div>
                  <strong>4.9/5</strong>
                  <div className="stars">{"★".repeat(5)}</div>
                </div>
                <div>
                  <strong>14.2M</strong>
                  <small>Episodes recorded</small>
                </div>
              </div>
            </div>
            <div className="reviews">
              {[
                {
                  img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
                  name: "Elena Rostova",
                  role: "Prestige TV Critic",
                  text: '"The React frontend is snappier than any other TV tracker. Checking off episodes feels like a video game achievement."',
                },
                {
                  img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
                  name: "Marcus Vance",
                  role: "Full Stack Engineer",
                  text: '"Seeing real episode data with instant progress updates is pure bliss."',
                },
                {
                  img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
                  name: "Priya Sharma",
                  role: "Anime & Drama Fan",
                  text: '"Finally a tracker that has all my shows without manual typing. The live catalog is a game changer!"',
                },
                {
                  img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
                  name: "Elena Rostova",
                  role: "Prestige TV Critic",
                  text: '"The React frontend is snappier than any other TV tracker. Checking off episodes feels like a video game achievement."',
                },
              ].map((r) => (
                <div key={r.name} className="review">
                  <div className="reviewer">
                    <img src={r.img} alt={r.name} />
                    <div>
                      <h5>{r.name}</h5>
                      <span>{r.role}</span>
                    </div>
                  </div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-wrap">
        <div className="cta">
          <h2>Ready to Never Ask "What Episode Was I On?"</h2>
          <p>
            Set up your custom watchlist in under 60 seconds. Search any show and start tracking with smart air
            notifications.
          </p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <a href="#interactive-demo" className="btn-primary lg">
                Track Your Shows
              </a>
            ) : (
              <Link to="/register" className="btn-primary lg">
                Create Your Account
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="mark">
              <Tv />
            </div>
            <b>BingeTrack</b>
            <span>&bull; Live TV catalog</span>
          </div>
          <div className="footer-links">
            <a href="#hero" onClick={handleHomeNavigation}>
              Home
            </a>
            <a href="#interactive-demo">Tracker</a>
            <a href="#recommendations">Recommendations</a>
            <a href="#features">Features</a>
            <a href="#stats">Reviews</a>
          </div>
          <div className="copyright">
            &copy; {new Date().getFullYear()} BingeTrack Inc. &mdash; TV tracking made simple
          </div>
        </div>
      </footer>
    </div>
  );
}
