import React, { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, 
  Zap, 
  Target, 
  Clock, 
  Users, 
  Play, 
  RotateCcw,
  Flag,
  Gauge,
  Settings,
  Volume2,
  VolumeX,
  Keyboard,
  BookOpen,
  Timer,
  Award,
  TrendingUp,
  Flame,
  Star,
  Crown,
  Medal,
  Sparkles,
  Music,
  Palette,
  Eye,
  Brain,
  Lightbulb
} from "lucide-react";

interface RaceStats {
  wpm: number;
  accuracy: number;
  timeElapsed: number;
  position: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  streak: number;
  maxWpm: number;
  consistency: number;
}

interface Player {
  id: string;
  name: string;
  position: number;
  wpm: number;
  accuracy: number;
  isFinished: boolean;
}

interface LeaderboardEntry {
  id: string;
  player_name: string;
  wpm: number;
  accuracy: number;
  completed_at: string;
  difficulty: string;
  text_category: string;
}

interface GameSettings {
  soundEnabled: boolean;
  showKeyboard: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  textCategory: 'general' | 'programming' | 'quotes' | 'literature' | 'custom';
  timerMode: boolean;
  timerDuration: number;
  theme: 'racing' | 'neon' | 'minimal' | 'dark';
  fontSize: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  requirement: (stats: RaceStats) => boolean;
}

const TEXT_CATEGORIES = {
  general: [
    "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is perfect for testing typing speed and accuracy.",
    "In the world of competitive typing, speed and precision are the keys to victory. Every keystroke matters when racing against time and opponents.",
    "Racing through words at lightning speed requires focus, practice, and determination. The fastest typists can reach over 100 words per minute with perfect accuracy.",
    "Technology has revolutionized the way we communicate, work, and learn. Typing skills have become essential in our digital age.",
    "The art of touch typing involves muscle memory, finger positioning, and rhythm. Professional typists develop these skills through consistent practice."
  ],
  programming: [
    "function calculateWPM(startTime, endTime, correctChars) { const timeInMinutes = (endTime - startTime) / 60000; return Math.round((correctChars / 5) / timeInMinutes); }",
    "const typingGame = { players: [], currentText: '', startTime: null, calculateStats() { return this.players.map(p => ({ ...p, wpm: this.getWPM(p) })); } };",
    "import React, { useState, useEffect } from 'react'; export default function TypingComponent() { const [text, setText] = useState(''); return <input onChange={e => setText(e.target.value)} />; }",
    "class TypingRace { constructor(text) { this.text = text; this.players = new Map(); } addPlayer(name) { this.players.set(name, { position: 0, wpm: 0 }); } }",
    "SELECT player_name, MAX(wpm) as best_wpm, AVG(accuracy) as avg_accuracy FROM typing_races WHERE completed_at > NOW() - INTERVAL 30 DAY GROUP BY player_name ORDER BY best_wpm DESC;"
  ],
  quotes: [
    "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. - Steve Jobs",
    "Innovation distinguishes between a leader and a follower. Stay hungry, stay foolish, and never stop learning. - Steve Jobs",
    "Life is what happens to you while you're busy making other plans. The best time to plant a tree was 20 years ago. The second best time is now. - John Lennon",
    "Be yourself; everyone else is already taken. We are all in the gutter, but some of us are looking at the stars. - Oscar Wilde",
    "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe. Imagination is more important than knowledge. - Albert Einstein"
  ],
  literature: [
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.",
    "To be or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.",
    "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore.",
    "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole.",
    "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man."
  ]
};

const DIFFICULTY_MODIFIERS = {
  easy: { timeBonus: 1.2, accuracyRequired: 85 },
  medium: { timeBonus: 1.0, accuracyRequired: 90 },
  hard: { timeBonus: 0.8, accuracyRequired: 95 },
  expert: { timeBonus: 0.6, accuracyRequired: 98 }
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_race',
    title: 'First Steps',
    description: 'Complete your first typing race',
    icon: <Flag className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.position >= 100
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Reach 80+ WPM',
    icon: <Zap className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.wpm >= 80
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Achieve 100% accuracy',
    icon: <Target className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.accuracy === 100 && stats.totalChars > 50
  },
  {
    id: 'lightning_fast',
    title: 'Lightning Fast',
    description: 'Reach 100+ WPM',
    icon: <Crown className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.wpm >= 100
  },
  {
    id: 'consistency_king',
    title: 'Consistency King',
    description: 'Maintain consistent speed throughout',
    icon: <Medal className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.consistency >= 90
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Get 50+ correct characters in a row',
    icon: <Flame className="w-4 h-4" />,
    unlocked: false,
    requirement: (stats) => stats.streak >= 50
  }
];

export default function TypingRaceGame() {
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [raceStats, setRaceStats] = useState<RaceStats>({
    wpm: 0,
    accuracy: 100,
    timeElapsed: 0,
    position: 0,
    totalChars: 0,
    correctChars: 0,
    incorrectChars: 0,
    streak: 0,
    maxWpm: 0,
    consistency: 100
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showNameInput, setShowNameInput] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    showKeyboard: false,
    difficulty: 'medium',
    textCategory: 'general',
    timerMode: false,
    timerDuration: 60,
    theme: 'racing',
    fontSize: 18
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play sound effect
  const playSound = useCallback((type: 'correct' | 'incorrect' | 'finish' | 'achievement') => {
    if (!settings.soundEnabled) return;
    
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'correct':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        break;
      case 'incorrect':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        break;
      case 'finish':
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        break;
      case 'achievement':
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        break;
    }
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [settings.soundEnabled]);

  // Check achievements
  const checkAchievements = useCallback((stats: RaceStats) => {
    const newUnlocked: Achievement[] = [];
    
    setAchievements(prev => prev.map(achievement => {
      if (!achievement.unlocked && achievement.requirement(stats)) {
        newUnlocked.push({ ...achievement, unlocked: true });
        playSound('achievement');
        return { ...achievement, unlocked: true };
      }
      return achievement;
    }));
    
    if (newUnlocked.length > 0) {
      setNewAchievements(newUnlocked);
      setTimeout(() => setNewAchievements([]), 5000);
    }
  }, [playSound]);

  // Calculate WPM and accuracy with advanced metrics
  const calculateStats = useCallback(() => {
    if (!startTime) return;
    
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const correctChars = userInput.split('').filter((char, index) => 
      char === currentText[index]
    ).length;
    const incorrectChars = userInput.length - correctChars;
    const wpm = Math.round((correctChars / 5) / timeElapsed) || 0;
    const accuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
    
    // Calculate streak
    let streak = 0;
    let maxStreakInRace = 0;
    let currentStreakInRace = 0;
    
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === currentText[i]) {
        currentStreakInRace++;
        maxStreakInRace = Math.max(maxStreakInRace, currentStreakInRace);
      } else {
        currentStreakInRace = 0;
      }
    }
    
    // Calculate consistency (how stable the WPM is)
    setWpmHistory(prev => {
      const newHistory = [...prev, wpm].slice(-10); // Keep last 10 measurements
      const avgWpm = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
      const variance = newHistory.reduce((acc, val) => acc + Math.pow(val - avgWpm, 2), 0) / newHistory.length;
      const consistency = Math.max(0, 100 - Math.sqrt(variance));
      
      const newStats = {
        wpm,
        accuracy,
        timeElapsed: timeElapsed * 60, // back to seconds
        position: (userInput.length / currentText.length) * 100,
        totalChars: userInput.length,
        correctChars,
        incorrectChars,
        streak: maxStreakInRace,
        maxWpm: Math.max(raceStats.maxWpm, wpm),
        consistency: Math.round(consistency)
      };
      
      setRaceStats(newStats);
      checkAchievements(newStats);
      
      return newHistory;
    });
  }, [userInput, currentText, startTime, raceStats.maxWpm, checkAchievements]);

  // Load leaderboard with filters
  const loadLeaderboard = useCallback(async (difficulty?: string, category?: string) => {
    try {
      let query = supabase
        .from('typing_races')
        .select('*')
        .order('wpm', { ascending: false })
        .limit(10);
      
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      if (category) {
        query = query.eq('text_category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }, []);

  // Save race result with additional data
  const saveRaceResult = useCallback(async () => {
    if (!playerName || raceStats.wpm === 0) return;
    
    try {
      const { error } = await supabase
        .from('typing_races')
        .insert({
          player_name: playerName,
          wpm: raceStats.wpm,
          accuracy: raceStats.accuracy,
          text_id: currentText.substring(0, 50),
          difficulty: settings.difficulty,
          text_category: settings.textCategory,
          completed_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await loadLeaderboard();
    } catch (error) {
      console.error('Error saving race result:', error);
    }
  }, [playerName, raceStats, currentText, settings, loadLeaderboard]);

  // Start countdown
  const startCountdown = () => {
    if (!playerName.trim()) return;
    
    setGameState('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start game
  const startGame = () => {
    const texts = TEXT_CATEGORIES[settings.textCategory];
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    setCurrentText(randomText);
    setUserInput('');
    setCurrentIndex(0);
    setGameState('playing');
    setStartTime(Date.now());
    setShowNameInput(false);
    setWpmHistory([]);
    setCurrentStreak(0);
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Reset game
  const resetGame = () => {
    setGameState('waiting');
    setUserInput('');
    setCurrentIndex(0);
    setStartTime(null);
    setCountdown(3);
    setRaceStats({
      wpm: 0,
      accuracy: 100,
      timeElapsed: 0,
      position: 0,
      totalChars: 0,
      correctChars: 0,
      incorrectChars: 0,
      streak: 0,
      maxWpm: 0,
      consistency: 100
    });
    setShowNameInput(true);
    setWpmHistory([]);
    setCurrentStreak(0);
    setMaxStreak(0);
  };

  // Handle typing with sound effects
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== 'playing') return;
    
    const value = e.target.value;
    const lastChar = value[value.length - 1];
    const expectedChar = currentText[value.length - 1];
    
    // Play sound for correct/incorrect typing
    if (lastChar) {
      if (lastChar === expectedChar) {
        playSound('correct');
        setCurrentStreak(prev => {
          const newStreak = prev + 1;
          setMaxStreak(max => Math.max(max, newStreak));
          return newStreak;
        });
      } else {
        playSound('incorrect');
        setCurrentStreak(0);
      }
    }
    
    setUserInput(value);
    setCurrentIndex(value.length);
    
    // Check if finished
    if (value.length === currentText.length) {
      setGameState('finished');
      playSound('finish');
      saveRaceResult();
    }
  };

  // Timer mode logic
  useEffect(() => {
    if (settings.timerMode && gameState === 'playing' && startTime) {
      const timer = setTimeout(() => {
        setGameState('finished');
        playSound('finish');
        saveRaceResult();
      }, settings.timerDuration * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [settings.timerMode, gameState, startTime, settings.timerDuration, playSound, saveRaceResult]);

  // Update stats periodically
  useEffect(() => {
    if (gameState === 'playing') {
      intervalRef.current = setInterval(calculateStats, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameState, calculateStats]);

  // Load leaderboard on mount
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Get speed color based on WPM
  const getSpeedColor = (wpm: number) => {
    if (wpm >= 80) return 'text-speed-4';
    if (wpm >= 60) return 'text-speed-3';
    if (wpm >= 40) return 'text-speed-2';
    return 'text-speed-1';
  };

  // Get speed background based on WPM
  const getSpeedBg = (wpm: number) => {
    if (wpm >= 80) return 'bg-speed-4';
    if (wpm >= 60) return 'bg-speed-3';
    if (wpm >= 40) return 'bg-speed-2';
    return 'bg-speed-1';
  };

  // Render text with highlighting
  const renderText = () => {
    return currentText.split('').map((char, index) => {
      let className = 'untyped-char';
      
      if (index < userInput.length) {
        className = userInput[index] === char ? 'correct-char' : 'incorrect-char';
      } else if (index === currentIndex) {
        className = 'current-char typing-cursor';
      }
      
      return (
        <span key={index} className={`${className} px-0.5 py-0.5 rounded-sm`} style={{ fontSize: `${settings.fontSize}px` }}>
          {char}
        </span>
      );
    });
  };

  // Virtual keyboard component
  const VirtualKeyboard = () => {
    const rows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];
    
    const nextChar = currentText[currentIndex]?.toLowerCase();
    
    return (
      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map(key => (
              <div
                key={key}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm font-mono border ${
                  key === nextChar ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'
                }`}
              >
                {key.toUpperCase()}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>TypeRacer Pro - Advanced Championship</title>
        <meta name="description" content="Advanced typing race game with achievements, customization, and detailed analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div 
        className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-accent/20"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop&crop=center')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}
      >
        <div className="min-h-screen bg-background/90 backdrop-blur-sm">
          {/* Achievement Notifications */}
          <AnimatePresence>
            {newAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: -100, x: 300 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="fixed top-4 right-4 z-50 bg-accent text-accent-foreground p-4 rounded-lg shadow-lg border border-accent/20"
                style={{ marginTop: `${index * 80}px` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-foreground/20 rounded-full flex items-center justify-center">
                    {achievement.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Achievement Unlocked!</div>
                    <div className="text-sm">{achievement.title}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Header */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card/95 backdrop-blur-sm border-b border-border/50"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-primary">TypeRacer Pro</h1>
                    <p className="text-sm text-muted-foreground">Advanced Championship Edition</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Settings Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Game Settings</DialogTitle>
                        <DialogDescription>Customize your typing experience</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sound">Sound Effects</Label>
                          <Switch
                            id="sound"
                            checked={settings.soundEnabled}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="keyboard">Show Virtual Keyboard</Label>
                          <Switch
                            id="keyboard"
                            checked={settings.showKeyboard}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showKeyboard: checked }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="timer">Timer Mode</Label>
                          <Switch
                            id="timer"
                            checked={settings.timerMode}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, timerMode: checked }))}
                          />
                        </div>
                        
                        {settings.timerMode && (
                          <div className="space-y-2">
                            <Label>Timer Duration: {settings.timerDuration}s</Label>
                            <Slider
                              value={[settings.timerDuration]}
                              onValueChange={([value]) => setSettings(prev => ({ ...prev, timerDuration: value }))}
                              min={30}
                              max={300}
                              step={30}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Font Size: {settings.fontSize}px</Label>
                          <Slider
                            value={[settings.fontSize]}
                            onValueChange={([value]) => setSettings(prev => ({ ...prev, fontSize: value }))}
                            min={14}
                            max={24}
                            step={2}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Difficulty</Label>
                          <Select value={settings.difficulty} onValueChange={(value: any) => setSettings(prev => ({ ...prev, difficulty: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Text Category</Label>
                          <Select value={settings.textCategory} onValueChange={(value: any) => setSettings(prev => ({ ...prev, textCategory: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="programming">Programming</SelectItem>
                              <SelectItem value="quotes">Quotes</SelectItem>
                              <SelectItem value="literature">Literature</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {gameState === 'playing' && (
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span className={`text-2xl font-bold ${getSpeedColor(raceStats.wpm)}`}>
                          {raceStats.wpm}
                        </span>
                        <span className="text-sm text-muted-foreground">WPM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold text-success">
                          {raceStats.accuracy}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-semibold text-accent">
                          {currentStreak}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-mono">
                          {Math.floor(raceStats.timeElapsed)}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Game Area */}
              <div className="lg:col-span-3 space-y-6">
                <AnimatePresence mode="wait">
                  {/* Countdown */}
                  {gameState === 'countdown' && (
                    <motion.div
                      key="countdown"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                      <div className="text-center">
                        <motion.div
                          key={countdown}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-8xl font-bold text-primary mb-4"
                        >
                          {countdown || 'GO!'}
                        </motion.div>
                        <p className="text-xl text-muted-foreground">Get ready to race!</p>
                      </div>
                    </motion.div>
                  )}

                  {showNameInput && gameState === 'waiting' && (
                    <motion.div
                      key="name-input"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                        <CardHeader className="text-center">
                          <CardTitle className="text-3xl text-primary">Ready to Race?</CardTitle>
                          <CardDescription className="text-lg">
                            Enter your name and prepare for the ultimate typing challenge
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="max-w-md mx-auto space-y-4">
                            <Input
                              placeholder="Enter your racing name..."
                              value={playerName}
                              onChange={(e) => setPlayerName(e.target.value)}
                              className="text-center text-lg h-12"
                              onKeyPress={(e) => e.key === 'Enter' && startCountdown()}
                            />
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="bg-muted/30 p-3 rounded-lg">
                                <div className="font-medium">Difficulty</div>
                                <div className="text-muted-foreground capitalize">{settings.difficulty}</div>
                              </div>
                              <div className="bg-muted/30 p-3 rounded-lg">
                                <div className="font-medium">Category</div>
                                <div className="text-muted-foreground capitalize">{settings.textCategory}</div>
                              </div>
                            </div>
                            
                            <Button 
                              onClick={startCountdown}
                              disabled={!playerName.trim()}
                              className="w-full h-12 text-lg"
                              size="lg"
                            >
                              <Play className="w-5 h-5 mr-2" />
                              Start Racing
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {gameState !== 'waiting' && gameState !== 'countdown' && (
                    <motion.div
                      key="game-area"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      {/* Progress Track */}
                      <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Flag className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Race Progress</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(raceStats.position)}% Complete
                                </span>
                                {settings.timerMode && (
                                  <span className="text-sm text-warning">
                                    {Math.max(0, settings.timerDuration - Math.floor(raceStats.timeElapsed))}s left
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="relative">
                              <div className="racing-track h-8 rounded-lg relative overflow-hidden">
                                <motion.div
                                  className="racing-car absolute top-1/2 -translate-y-1/2 w-8 h-6 bg-primary rounded-md flex items-center justify-center"
                                  style={{ left: `${Math.min(raceStats.position, 95)}%` }}
                                  animate={{ x: 0 }}
                                  transition={{ type: "spring", stiffness: 100 }}
                                >
                                  <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Typing Area */}
                      <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                        <CardContent className="p-8">
                          <div className="space-y-6">
                            <div className="text-xl leading-relaxed font-mono bg-muted/30 p-6 rounded-lg border-2 border-dashed border-border min-h-[120px]">
                              {renderText()}
                            </div>
                            
                            <Input
                              ref={inputRef}
                              value={userInput}
                              onChange={handleTyping}
                              disabled={gameState === 'finished'}
                              placeholder="Start typing here..."
                              className="text-lg h-14 font-mono"
                              autoComplete="off"
                              spellCheck={false}
                            />
                            
                            {settings.showKeyboard && <VirtualKeyboard />}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Enhanced Stats Dashboard */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className={`text-2xl font-bold ${getSpeedColor(raceStats.wpm)}`}>
                              {raceStats.wpm}
                            </div>
                            <div className="text-sm text-muted-foreground">WPM</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-success">
                              {raceStats.accuracy}%
                            </div>
                            <div className="text-sm text-muted-foreground">Accuracy</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-accent">
                              {currentStreak}
                            </div>
                            <div className="text-sm text-muted-foreground">Streak</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {raceStats.maxWpm}
                            </div>
                            <div className="text-sm text-muted-foreground">Max WPM</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-warning">
                              {raceStats.consistency}%
                            </div>
                            <div className="text-sm text-muted-foreground">Consistency</div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-destructive">
                              {raceStats.incorrectChars}
                            </div>
                            <div className="text-sm text-muted-foreground">Errors</div>
                          </CardContent>
                        </Card>
                      </div>

                      {gameState === 'finished' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className="bg-card/95 backdrop-blur-sm border-border/50 border-primary/50">
                            <CardHeader className="text-center">
                              <CardTitle className="text-2xl text-primary flex items-center justify-center gap-2">
                                <Trophy className="w-6 h-6" />
                                Race Complete!
                              </CardTitle>
                              <CardDescription>
                                Great job, {playerName}! Here are your final results.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center space-y-6">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className={`text-3xl font-bold ${getSpeedColor(raceStats.wpm)}`}>
                                    {raceStats.wpm}
                                  </div>
                                  <div className="text-sm text-muted-foreground">WPM</div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="text-3xl font-bold text-success">
                                    {raceStats.accuracy}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Accuracy</div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="text-3xl font-bold text-accent">
                                    {maxStreak}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Best Streak</div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <div className="text-3xl font-bold text-warning">
                                    {raceStats.consistency}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Consistency</div>
                                </div>
                              </div>
                              
                              <Button onClick={resetGame} size="lg" className="mt-6">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Race Again
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Enhanced Sidebar */}
              <div className="space-y-6">
                <Tabs defaultValue="leaderboard" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                    <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="leaderboard" className="space-y-4">
                    <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-accent" />
                          Leaderboard
                        </CardTitle>
                        <CardDescription>Top racers of all time</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {leaderboard.length > 0 ? (
                          leaderboard.map((entry, index) => (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={index === 0 ? "default" : "secondary"}
                                  className={index === 0 ? "bg-accent text-accent-foreground" : ""}
                                >
                                  #{index + 1}
                                </Badge>
                                <div>
                                  <div className="font-medium text-sm">
                                    {entry.player_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {entry.accuracy}% • {entry.difficulty}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-lg font-bold ${getSpeedColor(entry.wpm)}`}>
                                {entry.wpm}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No races yet!</p>
                            <p className="text-xs">Be the first to set a record</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="achievements" className="space-y-4">
                    <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-accent" />
                          Achievements
                        </CardTitle>
                        <CardDescription>
                          {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {achievements.map((achievement) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              achievement.unlocked ? 'bg-accent/10 border border-accent/20' : 'bg-muted/30'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              achievement.unlocked ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {achievement.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {achievement.description}
                              </div>
                            </div>
                            {achievement.unlocked && (
                              <Sparkles className="w-4 h-4 text-accent" />
                            )}
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Speed Guide */}
                <Card className="bg-card/95 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-primary" />
                      Speed Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Beginner</span>
                      <Badge className="bg-speed-1 text-white">0-40 WPM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Intermediate</span>
                      <Badge className="bg-speed-2 text-white">40-60 WPM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Advanced</span>
                      <Badge className="bg-speed-3 text-white">60-80 WPM</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Expert</span>
                      <Badge className="bg-speed-4 text-white">80+ WPM</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}