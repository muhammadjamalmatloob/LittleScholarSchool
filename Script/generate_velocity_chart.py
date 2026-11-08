import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def generate_chart():
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("[!] Matplotlib is required. Installing now...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "matplotlib"])
        import matplotlib.pyplot as plt
        import numpy as np

    # =========================================================================
    # SPRINT VELOCITY DATA (SPM Course Standards & Trello Alignment)
    # =========================================================================
    sprints = [
        "Sprint 1\n(Closed)",
        "Sprint 2\n(Closed)",
        "Sprint 3\n(ACTIVE / IN PROGRESS)",
    ]
    
    # Planned vs Completed Story Points
    committed = [21, 48, 42]
    completed = [21, 42, 0]          # Sprint 3 is active, so 0 accepted so far
    in_progress = [0, 0, 31]         # Sprint 3: 19 SP in QA & Testing + 12 SP in Progress
    to_do = [0, 0, 11]               # Sprint 3: 11 SP queued in To Do

    # Historical average velocity calculated ONLY from closed sprints (Sprint 1 & 2)
    closed_completed = [completed[0], completed[1]]
    avg_velocity = sum(closed_completed) / len(closed_completed)

    # =========================================================================
    # PLOT STYLING & CONFIGURATION
    # =========================================================================
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    fig, ax = plt.subplots(figsize=(10, 6.2), dpi=300)

    x = np.arange(len(sprints))
    width = 0.32

    # Bars
    rects_committed = ax.bar(
        x - width / 2,
        committed,
        width,
        label="Committed (Sprint Planning)",
        color="#4338CA",   # Deep Indigo
        alpha=0.9,
        edgecolor="#312E81",
        linewidth=1,
    )
    
    rects_completed = ax.bar(
        x[:2] + width / 2,
        completed[:2],
        width,
        label="Completed (Accepted at Review)",
        color="#059669",   # Emerald Green
        alpha=0.92,
        edgecolor="#047857",
        linewidth=1,
    )

    # Active Sprint 3 Bar: Amber with diagonal stripes representing work currently undergoing QA/Dev
    rects_active = ax.bar(
        x[2] + width / 2,
        in_progress[2],
        width,
        label="In Progress / QA Verification (Active)",
        color="#F59E0B",   # Amber / Orange
        hatch="//",
        alpha=0.75,
        edgecolor="#D97706",
        linewidth=1.2,
    )

    # Average Velocity Benchmark Line (31.5 SP)
    ax.axhline(
        avg_velocity,
        color="#DC2626",
        linestyle="--",
        linewidth=2,
        label=f"Avg Historical Velocity ({avg_velocity:.1f} SP / Sprint)",
        zorder=3,
    )

    # =========================================================================
    # LABELS, ANNOTATIONS & CALLOUTS
    # =========================================================================
    ax.set_ylabel("Story Points (SP)", fontsize=12, fontweight="bold", labelpad=12, color="#1F2937")
    ax.set_title("Sprint Velocity Chart — School Management System (Agile / Scrum)", fontsize=14, fontweight="bold", pad=18, color="#111827")
    ax.set_xticks(x)
    ax.set_xticklabels(sprints, fontsize=11, fontweight="medium", color="#1F2937")
    ax.set_ylim(0, 62)
    ax.grid(axis="y", linestyle=":", alpha=0.6, zorder=0)

    # Legend
    ax.legend(
        frameon=True,
        facecolor="white",
        edgecolor="#E5E7EB",
        framealpha=0.95,
        fontsize=10,
        loc="upper left",
    )

    # Numeric Labels above bars
    ax.bar_label(rects_committed, padding=5, fontsize=10.5, fontweight="bold", color="#312E81")
    ax.bar_label(rects_completed, padding=5, fontsize=10.5, fontweight="bold", color="#065F46")
    ax.bar_label(
        rects_active,
        padding=5,
        fontsize=10,
        fontweight="bold",
        color="#B45309",
        labels=[f"{in_progress[2]} SP\n(In Progress)"],
    )

    # Callout Annotation for Jamal's Hackathon Spillover in Sprint 2
    # Positioned cleanly above the 42 bar with no overlap
    ax.annotate(
        "6 SP Spillover to Sprint 3\n(Weekend Hackathon Delay)",
        xy=(1 + width / 2, 44),
        xytext=(1.20, 54),
        arrowprops=dict(
            arrowstyle="->",
            color="#B91C1C",
            lw=1.6,
            connectionstyle="arc3,rad=-0.15",
        ),
        fontsize=9,
        fontweight="bold",
        color="#B91C1C",
        ha="center",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="#FEE2E2", edgecolor="#EF4444", alpha=0.95),
    )

    # Callout Box for Active Sprint Status
    ax.text(
        2.28,
        18,
        "Active Sprint 3 Status:\n• 19 SP in QA & Testing\n• 12 SP in Development\n• 11 SP in To-Do Queue\n(Musfirah: QA Lead)",
        fontsize=9,
        color="#374151",
        linespacing=1.35,
        bbox=dict(boxstyle="round,pad=0.45", facecolor="#FEF3C7", edgecolor="#F59E0B", alpha=0.9),
    )

    plt.tight_layout()

    # Determine output path: Save in project root directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_png = os.path.join(base_dir, "velocity_chart.png")
    plt.savefig(output_png, bbox_inches="tight")
    plt.close()

    print("\n" + "=" * 70)
    print(f"[SUCCESS] Velocity chart generated successfully!")
    print(f"Output File: {output_png}")
    print("=" * 70)
    print("\n[Summary Metrics for Saad's Retrospective Document]:")
    print(f"  • Sprint 1 (Closed):  Committed = 21 SP | Completed = 21 SP | Say/Do Ratio = 100.0%")
    print(f"  • Sprint 2 (Closed):  Committed = 48 SP | Completed = 42 SP | Spillover = 6 SP | Say/Do = 87.5%")
    print(f"      -> Reason: Jamal's weekend hackathon shifted final API merges to Sunday.")
    print(f"  • Sprint 3 (Active):  Committed = 42 SP | In Progress = 31 SP (19 QA + 12 Dev) | To Do = 11 SP")
    print(f"  • Team Historical Velocity: {avg_velocity:.1f} SP / Sprint (Calculated strictly from closed sprints)")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    generate_chart()
