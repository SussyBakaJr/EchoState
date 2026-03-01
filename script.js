const EchoState = {
    moodInterpretations: {
        calm: "You're finding your center. The world feels steady.",
        nostalgia: "You're visiting old versions of yourself. It's a sweet, heavy kind of magic.",
        healing: "You're mending. Give yourself permission to breathe deeply.",
        sad: "Rainy days are necessary for growth. Honor the quiet.",
        hype: "You're operating at a high frequency. Channel that fire.",
        chaos: "Your energy is unpredictable and electric. Lean into the static.",
        focus: "You're in the flow. The noise is fading out."
    },

    songs: [],
    currentFilter: "all", 
    pieChart: null,
    trendChart: null,
    dominantMood: null,
    currentParticleColor: "rgba(200,200,255,0.15)",
    burstActive: 0,
    weeklyGoal: 5, //weekly logging goal for progress bar

    moodColors: {
        calm: "#5a8fd8",
        nostalgia: "#d07a9a",
        healing: "#5fa97a",
        sad: "#6c86b3",
        hype: "#e08a3e",
        chaos: "#8b6fd6",
        focus: "#5f7f9f"
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initChart();
        this.loadDarkMode();
        this.updateInitialMood();
        this.initParticles();
        this.updateUI();
    },

    cacheDOM() {
        this.songName = document.getElementById("songName");
        this.moodSelect = document.getElementById("moodSelect");
        this.energySlider = document.getElementById("energySlider");
        this.energyValue = document.getElementById("energyValue");
        this.addSongBtn = document.getElementById("addSongBtn");
        this.resetBtn = document.getElementById("resetBtn");
        this.exportBtn = document.getElementById("exportBtn");
        this.importBtn = document.getElementById("importBtn");
        this.importFile = document.getElementById("importFile");
        this.shareBtn = document.getElementById("shareBtn");
        this.darkToggle = document.getElementById("darkToggle");
        this.moodBox = document.getElementById("moodBox");
        this.energyBox = document.getElementById("energyBox");
        this.insightText = document.getElementById("insightText");
        this.chartContainer = document.getElementById("chartContainer");
        this.songList = document.getElementById("songList");
        this.bgCanvas = document.getElementById("bgParticles");
        this.bgCtx = this.bgCanvas.getContext("2d");
        this.moodCalendar = document.getElementById("moodCalendar");
        this.calendarMonth = document.getElementById("calendarMonth");
        
        this.toggleAllTime = document.getElementById("toggleAllTime");
        this.toggleWeekly = document.getElementById("toggleWeekly");
        this.statEmoji = document.getElementById("statEmoji");
        this.statValue = document.getElementById("statValue");
        this.statSubtitle = document.getElementById("statSubtitle");
        this.trophyCase = document.getElementById("trophyCase");

        this.streakBadge = document.getElementById("streakBadge");
        this.streakCount = document.getElementById("streakCount");
        
        this.goalBar = document.getElementById("goalBar");
        this.goalText = document.getElementById("goalText");
    },

    bindEvents() {
        this.shareBtn.addEventListener("click", () => {
            this.generateShareCard();
        });

        this.exportBtn.addEventListener("click", () => {
            this.exportData();
            alert("Vibe History Exported! Check your downloads. 📂");
        });

        this.importBtn.addEventListener("click", () => this.importFile.click());
        this.importFile.addEventListener("change", (e) => this.importData(e));

        this.energySlider.addEventListener("input", () => {
            this.energyValue.innerText = this.energySlider.value;
        });

        this.addSongBtn.addEventListener("click", async () => {
            const name = this.songName.value.trim();
            const mood = this.moodSelect.value;
            const energy = parseInt(this.energySlider.value);
            if (!name || !mood) return;

            const newSong = { name, mood, energy, date: new Date().toISOString() };

            if (window.saveSongToCloud) {
                await window.saveSongToCloud(newSong);
            }
            this.checkMilestones(); 

            this.burstActive = 1; 
            setTimeout(() => this.burstActive = 0, 800);

            this.songName.value = "";
            this.moodSelect.value = "";
            this.energySlider.value = 3;
            this.energyValue.innerText = 3;
        });

        this.resetBtn.addEventListener("click", () => {
            if (confirm("Are you sure? This will delete your entire mood history and streaks.")) {
                if (confirm("LAST CHANCE: This cannot be undone without a backup JSON. Reset now?")) {
                    this.songs = [];
                    this.save();
                    this.updateUI();
                    alert("History Cleared. ✨");
                }
            }
        });

        this.darkToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        });

        if(this.toggleAllTime) {
            this.toggleAllTime.addEventListener("click", () => {
                this.currentFilter = "all";
                this.toggleAllTime.classList.add("active");
                this.toggleWeekly.classList.remove("active");
                this.updateUI();
            });
        }

        if(this.toggleWeekly) {
            this.toggleWeekly.addEventListener("click", () => {
                this.currentFilter = "weekly";
                this.toggleWeekly.classList.add("active");
                this.toggleAllTime.classList.remove("active");
                this.updateUI();
            });
        }

        window.addEventListener("resize", () => this.resizeCanvas());
    },

    getStreak() {
        if (this.songs.length === 0) return 0;
        const dates = [...new Set(this.songs.map(s => s.date.split('T')[0]))].sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        let today = new Date();
        today.setHours(0,0,0,0);
        
        for (let i = 0; i < dates.length; i++) {
            let check = new Date();
            check.setDate(today.getDate() - i);
            let checkStr = check.toISOString().split('T')[0];
            if (dates.includes(checkStr)) streak++;
            else break;
        }
        return streak;
    },

    checkMilestones() {
        const streak = this.getStreak();
        const milestones = { 10: "Bronze Vibe! 🥉", 30: "Silver Soul! 🥈", 182: "Golden Echo! 🥇", 365: "Diamond Heart! 💎" };
        if (milestones[streak]) {
            const lastAlert = localStorage.getItem("lastMilestoneAlert");
            const todayStr = new Date().toISOString().split('T')[0];
            if (lastAlert !== todayStr + "_" + streak) {
                alert(milestones[streak]);
                localStorage.setItem("lastMilestoneAlert", todayStr + "_" + streak);
            }
        }
    },

    updateUI() {
        const streak = this.getStreak();
        const moodColor = this.moodColors[this.dominantMood] || "#9f84d6";
        
        // Streak Badge with Vibe Color
        if (this.streakBadge && this.streakCount) {
            if (streak > 0) {
                this.streakBadge.style.display = "inline-block";
                this.streakCount.innerText = streak;
                this.streakBadge.style.borderColor = moodColor;
                this.streakBadge.style.color = moodColor;
            } else {
                this.streakBadge.style.display = "none";
            }
        }

        // Weekly Goal Progress Calculation
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklySongs = this.songs.filter(s => new Date(s.date) >= weekAgo).length;
        const progress = Math.min((weeklySongs / this.weeklyGoal) * 100, 100);

        if (this.goalBar && this.goalText) {
            this.goalBar.style.width = progress + "%";
            this.goalBar.style.backgroundColor = moodColor;
            this.goalText.innerText = `${weeklySongs}/${this.weeklyGoal} tracks this week`;
        }

        if (this.songs.length === 0) {

    this.chartContainer.style.display = "none";
    this.songList.innerHTML = "";

    this.dominantMood = null;

    this.moodBox.innerHTML = "No listening data yet.";
    this.energyBox.innerHTML = "Add songs to see energy levels.";

    this.statEmoji.innerText = "🎧";
    this.statValue.innerText = "---";
    this.statSubtitle.innerHTML = "🔥 0 Day Streak";

    this.goalBar.style.width = "0%";
    this.goalText.innerText = `0/${this.weeklyGoal} tracks this week`;

    this.insightText.innerHTML = "Log a track to begin your journey.";

    this.streakBadge.style.display = "none";

    document.body.classList.remove(...Object.keys(this.moodColors));

   
    if (this.pieChart) {
        this.pieChart.data.labels = [];
        this.pieChart.data.datasets[0].data = [];
        this.pieChart.update();
    }

    if (this.trendChart) {
        this.trendChart.data.labels = [];
        this.trendChart.data.datasets[0].data = [];
        this.trendChart.update();
    }

    this.moodCalendar.innerHTML = "";
    return;
}

        let filtered = [...this.songs];
        if (this.currentFilter === "weekly") {
            filtered = this.songs.filter(s => new Date(s.date) >= weekAgo);
        }

        this.chartContainer.style.display = "flex";
        const moodCount = {};
        filtered.forEach(s => moodCount[s.mood] = (moodCount[s.mood] || 0) + 1);
        
        if (filtered.length > 0) {
            this.dominantMood = Object.keys(moodCount).reduce((a, b) => moodCount[a] > moodCount[b] ? a : b);
            const avgEnergy = (filtered.reduce((sum, s) => sum + s.energy, 0) / filtered.length).toFixed(1);
        
            this.moodBox.innerHTML = `Dominant Mood:<br><strong>${this.dominantMood.toUpperCase()}</strong>`;
            this.energyBox.innerHTML = `Average Energy:<br><strong>${avgEnergy} / 5</strong>`;
            document.body.classList.remove(...Object.keys(this.moodColors));
            document.body.classList.add(this.dominantMood);

            const emojis = { calm: "🌊", nostalgia: "⏳", healing: "🌿", sad: "☁️", hype: "🔥", chaos: "⚡", focus: "🎯" };
            if (this.statEmoji) this.statEmoji.innerText = emojis[this.dominantMood] || "🎧";
            if (this.statValue) this.statValue.innerText = this.dominantMood.toUpperCase();
            if (this.statSubtitle) {
                this.statSubtitle.innerHTML = `🔥 ${streak} Day Streak<br>${this.currentFilter === 'all' ? 'All-Time' : 'Weekly'}`;
            }

            if (this.trophyCase) {
                this.trophyCase.style.display = streak >= 30 ? "block" : "none";
                if (streak >= 30) this.trophyCase.innerText = "🥈";
                if (streak >= 182) this.trophyCase.innerText = "🥇";
                if (streak >= 365) this.trophyCase.innerText = "💎";
                this.trophyCase.style.filter = "drop-shadow(0 0 12px gold)";
            }

            this.insightText.innerHTML = this.generateAdvancedInsight(filtered);
            this.pieChart.data.labels = Object.keys(moodCount);
            this.pieChart.data.datasets[0].data = Object.values(moodCount);
            this.pieChart.data.datasets[0].backgroundColor = Object.keys(moodCount).map(m => this.moodColors[m]);
            this.pieChart.update();

            this.trendChart.data.labels = filtered.map(() => "");
            this.trendChart.data.datasets[0].data = filtered.map(s => s.energy);
            this.trendChart.update();
        }

        this.updateSongList();
        this.updateCalendar();
        this.updateParticleColor();
    },

    loadDarkMode() { if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark"); },

    initChart() {
        const c1 = document.getElementById("moodChart").getContext("2d");
        const c2 = document.getElementById("energyTrendChart").getContext("2d");
        this.pieChart = new Chart(c1, {
            type: "pie",
            data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } } }
        });
        this.trendChart = new Chart(c2, {
            type: "line",
            data: { labels: [], datasets: [{ data: [], borderColor: '#9f84d6', borderWidth: 3, pointRadius: 2, tension: 0.4, fill: true, backgroundColor: 'rgba(159, 132, 214, 0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 1, max: 5, display: false }, x: { display: false } } }
        });
    },

    
    
    updateCalendar() {
    this.moodCalendar.innerHTML = "";
    
    // Local date info
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Update the Month Label (e.g., "March 2026")
    const monthName = now.toLocaleString('default', { month: 'long' });
    if (this.calendarMonth) this.calendarMonth.innerText = `${monthName} ${year}`;

    // Map songs using LOCAL date strings (YYYY-MM-DD)
    const groups = {};
    this.songs.forEach(s => {
        const localDate = new Date(s.date);
        // This ensures we use the date based on YOUR clock, not UTC
        const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(s.mood);
    });

    // Calculate days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Generate the days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const div = document.createElement("div");
        div.className = "calendar-day";
        
        if (day === now.getDate()) {
            div.style.border = "2px solid var(--grad1)";
        }

        if (groups[dateKey]) {
            const counts = {};
            groups[dateKey].forEach(m => counts[m] = (counts[m] || 0) + 1);
            const dm = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            
            div.style.backgroundColor = this.moodColors[dm];
            div.style.color = "white";
            div.innerHTML = `${day}<span>${dm[0].toUpperCase()}</span>`;
        } else {
            div.innerText = day;
            // Make empty days slightly faded in dark mode
            div.style.opacity = "0.5"; 
        }
        
        this.moodCalendar.appendChild(div);
    }
},

    generateAdvancedInsight(list) {
        const avg = list.reduce((a, b) => a + b.energy, 0) / list.length;
        return `<div class="insight-poetic">${this.moodInterpretations[this.dominantMood] || "Evolving through sound."}</div>
                <div class="insight-details">Energy: <strong>${avg.toFixed(1)}/5</strong></div>`;
    },

    updateSongList() {
    this.songList.innerHTML = "";

    // Reverse for newest first
    const reversedSongs = [...this.songs].reverse();

    reversedSongs.forEach((song) => {
        const li = document.createElement("li");

        const songDate = new Date(song.date);
        const timeStr = songDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        li.innerHTML = `
            <span>
                <strong>${song.name}</strong>
                <small style="opacity: 0.6; margin-left: 8px;">${timeStr}</small>
                <br>
                <small>${song.mood} • Energy: ${song.energy}</small>
            </span>
            <button class="small-btn">&times;</button>
        `;

        li.querySelector("button").addEventListener("click", async () => {
            if (window.deleteSongFromCloud && song.id) {
                await window.deleteSongFromCloud(song.id);
            }
        });

        this.songList.appendChild(li);
    });
},

    initParticles() {
        this.resizeCanvas();
        this.particles = [];
        for (let i = 0; i < 60; i++) {
            this.particles.push({ x: Math.random() * this.bgCanvas.width, y: Math.random() * this.bgCanvas.height, radius: Math.random() * 2, speed: Math.random() * 0.4 + 0.1 });
        }
        this.animateParticles();
    },

    resizeCanvas() { this.bgCanvas.width = window.innerWidth; this.bgCanvas.height = window.innerHeight; },
    updateParticleColor() { this.currentParticleColor = this.moodColors[this.dominantMood] || "rgba(150,150,255,0.2)"; },

    animateParticles() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.particles.forEach(p => {
            p.y -= p.speed + (this.burstActive * 4);
            if (p.y < 0) { p.y = this.bgCanvas.height; p.x = Math.random() * this.bgCanvas.width; }
            this.bgCtx.beginPath(); this.bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.bgCtx.fillStyle = this.currentParticleColor; this.bgCtx.globalAlpha = 0.6; this.bgCtx.fill();
        });
        requestAnimationFrame(() => this.animateParticles());
    },

    updateInitialMood() {
        if (this.songs.length > 0) {
            const mc = {}; this.songs.forEach(s => mc[s.mood] = (mc[s.mood] || 0) + 1);
            this.dominantMood = Object.keys(mc).reduce((a, b) => mc[a] > mc[b] ? a : b);
        }
        this.updateParticleColor();
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.songs, null, 2)], {type : 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `echostate-${new Date().toLocaleDateString()}.json`; a.click();
    },

    generateShareCard() {
        const canvas = document.getElementById("shareCanvas");
        const ctx = canvas.getContext("2d");
        const streak = this.getStreak();
        const mood = this.dominantMood || "Neutral";
        const color = this.moodColors[mood] || "#9f84d6";
        const latestSong = this.songs[this.songs.length - 1]?.name || "Silence";

        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "#121212");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        for(let i=0; i<50; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*1080, Math.random()*1920, Math.random()*5, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 60px sans-serif";
        ctx.fillText("ECHOSTATE JOURNEY", 540, 200);
        ctx.font = "bold 350px sans-serif";
        ctx.fillText(streak, 540, 750);
        ctx.font = "100px sans-serif";
        ctx.fillText("DAY STREAK", 540, 880);
        ctx.font = "italic 70px sans-serif";
        ctx.fillText(`Current Vibe: ${mood.toUpperCase()}`, 540, 1100);
        ctx.font = "bold 80px sans-serif";
        ctx.fillText(`"${latestSong}"`, 540, 1500);

        const link = document.createElement('a');
        link.download = `echostate-share.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSongs = JSON.parse(e.target.result);
                if (Array.isArray(importedSongs)) {
                    if (confirm(`Found ${importedSongs.length} songs. Restore history?`)) {
                        this.songs = importedSongs;
                        this.save();
                        this.updateUI();
                        alert("History Restored! 🔥");
                    }
                }
            } catch (err) { alert("Invalid file."); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
};

window.EchoState = EchoState;
EchoState.init();