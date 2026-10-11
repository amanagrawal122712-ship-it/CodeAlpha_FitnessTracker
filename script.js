
const STEPS_GOAL = 10000;
const CALORIES_GOAL = 500;
const MINUTES_GOAL = 60;

const today = new Date();
const todayKey = getDateKey(today);

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getStoredData(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch {
        return fallback;
    }
}

let dailyData = getStoredData("fittrack_daily", {});
let workouts = getStoredData("fittrack_workouts", []);

if (!dailyData || typeof dailyData !== "object" || Array.isArray(dailyData)) {
    dailyData = {};
}

if (!Array.isArray(workouts)) {
    workouts = [];
}

function getTodayData() {
    if (!dailyData[todayKey]) {
        dailyData[todayKey] = {
            steps: 0,
            calories: 0,
            minutes: 0
        };
    }

    return dailyData[todayKey];
}

function saveData() {
    localStorage.setItem("fittrack_daily", JSON.stringify(dailyData));
    localStorage.setItem("fittrack_workouts", JSON.stringify(workouts));
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function setProgress(elementId, percentage) {
    document.getElementById(elementId).style.width =
        `${Math.min(100, Math.max(0, percentage))}%`;
}

function updateDashboard() {
    const data = getTodayData();

    document.getElementById("stepsValue").textContent =
        data.steps.toLocaleString();

    document.getElementById("caloriesValue").textContent =
        data.calories.toLocaleString();

    document.getElementById("minutesValue").textContent =
        data.minutes.toLocaleString();

    const stepsPercent = Math.round(data.steps / STEPS_GOAL * 100);
    const caloriesPercent = Math.round(data.calories / CALORIES_GOAL * 100);
    const minutesPercent = Math.round(data.minutes / MINUTES_GOAL * 100);

    document.getElementById("stepsPercent").textContent =
        `${stepsPercent}% of daily goal`;

    document.getElementById("caloriesPercent").textContent =
        `${caloriesPercent}% of daily goal`;

    document.getElementById("minutesPercent").textContent =
        `${minutesPercent}% of daily goal`;

    setProgress("stepsProgress", stepsPercent);
    setProgress("caloriesProgress", caloriesPercent);
    setProgress("minutesProgress", minutesPercent);

    const goalPercent = Math.min(100, stepsPercent);

    document.getElementById("goalPercent").textContent =
        `${goalPercent}%`;

    document.getElementById("goalCircle").style.background =
        `conic-gradient(var(--green) ${goalPercent}%, #292f3d ${goalPercent}%)`;

    let message = "Every step counts. Let's get moving!";

    if (goalPercent >= 100) {
        message = "Amazing! You reached your daily step goal!";
    } else if (goalPercent >= 75) {
        message = "Almost there! Keep pushing forward.";
    } else if (goalPercent >= 40) {
        message = "Great progress! Keep up the good work.";
    }

    document.getElementById("goalMessage").textContent = message;

    saveData();
    updateChart();
}

document.getElementById("currentDate").textContent =
    today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

document.getElementById("stepsForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const input = document.getElementById("stepsInput");
    const steps = Number(input.value);

    if (!Number.isInteger(steps) || steps < 0 || steps > 100000) {
        showToast("Enter a valid step count.");
        return;
    }

    getTodayData().steps = steps;
    saveData();
    updateDashboard();
    input.value = "";

    showToast("Steps saved successfully!");
});

document.getElementById("workoutForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("workoutName").value.trim();
    const duration = Number(document.getElementById("workoutDuration").value);
    const calories = Number(document.getElementById("workoutCalories").value);

    if (!name || !Number.isInteger(duration) || duration < 1 ||
        duration > 1440 || !Number.isFinite(calories) ||
        calories < 0 || calories > 20000) {
        showToast("Please enter valid workout details.");
        return;
    }

    const workout = {
        id: Date.now(),
        name,
        duration,
        calories,
        date: todayKey
    };

    workouts.unshift(workout);

    const data = getTodayData();
    data.minutes += duration;
    data.calories += calories;

    saveData();
    updateDashboard();
    renderWorkouts();

    document.getElementById("workoutForm").reset();

    showToast("Workout logged successfully!");
});

function renderWorkouts() {
    const list = document.getElementById("workoutList");
    const count = document.getElementById("workoutCount");

    count.textContent = workouts.length;

    if (workouts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>💪</span>
                <p>No workouts logged yet.</p>
                <small>Add your first workout to get started.</small>
            </div>
        `;
        return;
    }

    list.innerHTML = "";

    workouts.slice(0, 30).forEach(workout => {
        const item = document.createElement("div");
        item.className = "workout-item";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        const info = document.createElement("p");
        const date = document.createElement("small");
        const calorieText = document.createElement("div");

        title.textContent = workout.name;
        info.textContent = `${workout.duration} minutes`;
        date.textContent = workout.date;
        calorieText.className = "workout-calories";
        calorieText.textContent = `${workout.calories} kcal`;

        details.append(title, info, date);
        item.append(details, calorieText);
        list.appendChild(item);
    });
}

document.getElementById("clearWorkoutsBtn").addEventListener("click", function () {
    if (workouts.length === 0) {
        showToast("No workout history to clear.");
        return;
    }

    const confirmed = confirm(
        "Clear all workout history? This will also reset logged workout calories and minutes."
    );

    if (!confirmed) return;

    workouts.forEach(workout => {
        const data = dailyData[workout.date];

        if (data) {
            data.calories = Math.max(0, data.calories - workout.calories);
            data.minutes = Math.max(0, data.minutes - workout.duration);
        }
    });

    workouts = [];

    saveData();
    updateDashboard();
    renderWorkouts();

    showToast("Workout history cleared.");
});

let activityChart = null;

function updateChart() {
    const canvas = document.getElementById("activityChart");

    if (typeof Chart === "undefined") {
        return;
    }

    const labels = [];
    const stepValues = [];
    const calorieValues = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const key = getDateKey(date);
        const data = dailyData[key] || {};

        labels.push(date.toLocaleDateString("en-US", {
            weekday: "short"
        }));

        stepValues.push(data.steps || 0);
        calorieValues.push(data.calories || 0);
    }

    if (activityChart) {
        activityChart.data.labels = labels;
        activityChart.data.datasets[0].data = stepValues;
        activityChart.data.datasets[1].data = calorieValues;
        activityChart.update();
        return;
    }

    activityChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Steps",
                    data: stepValues,
                    backgroundColor: "#b7f36b",
                    borderRadius: 5,
                    yAxisID: "y"
                },
                {
                    label: "Calories",
                    data: calorieValues,
                    backgroundColor: "#ffad73",
                    borderRadius: 5,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#c3cada",
                        usePointStyle: true,
                        padding: 18
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#929bad" }
                },
                y: {
                    beginAtZero: true,
                    position: "left",
                    grid: { color: "#272d3c" },
                    ticks: { color: "#929bad" }
                },
                y1: {
                    beginAtZero: true,
                    position: "right",
                    grid: { drawOnChartArea: false },
                    ticks: { color: "#929bad" }
                }
            }
        }
    });
}

updateDashboard();
renderWorkouts();
