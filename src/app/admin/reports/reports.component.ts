import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { formatCompact, formatCurrency } from '../../core/utils/currency.util';
import { avatarColors, formatMonthYear, initials, plural } from '../../core/utils/format.util';
import { IconComponent } from '../../shared/components/icon.component';
import { MonthReport, ReportsService } from './reports.service';

const CHART_FONT = { family: 'Plus Jakarta Sans', weight: 600 as const, size: 12 };

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, BaseChartDirective, IconComponent],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="page fade-in">
      <header class="page-header">
        <div>
          <h1>Reportes</h1>
          <p class="page-subtitle">Cómo le fue al estudio en {{ monthLabel().toLowerCase() }}.</p>
        </div>
        <div class="row row-wrap no-print">
          <div class="month-switch">
            <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="shiftMonth(-1)" aria-label="Mes anterior">
              <app-icon name="chevron-left" [size]="18" />
            </button>
            <strong>{{ monthLabel() }}</strong>
            <button
              type="button"
              class="btn btn-ghost btn-icon btn-sm"
              [disabled]="isCurrentMonth()"
              (click)="shiftMonth(1)"
              aria-label="Mes siguiente"
            >
              <app-icon name="chevron-right" [size]="18" />
            </button>
          </div>
          <button type="button" class="btn btn-icon" (click)="print()" aria-label="Imprimir reporte" title="Imprimir / PDF">
            <app-icon name="printer" [size]="18" />
          </button>
        </div>
      </header>

      <section class="grid grid-stats">
        <div class="card stat">
          <span class="stat-icon tone-success"><app-icon name="wallet" [size]="20" /></span>
          <span class="stat-label">Ingresos</span>
          @if (report(); as r) {
            <span class="stat-value">{{ formatCurrency(r.revenue) }}</span>
          } @else {
            <span class="skeleton" style="height: 30px; width: 70%"></span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon tone-primary"><app-icon name="calendar-check" [size]="20" /></span>
          <span class="stat-label">Sesiones</span>
          @if (report(); as r) {
            <span class="stat-value">{{ r.sessionCount }}</span>
          } @else {
            <span class="skeleton" style="height: 30px; width: 40%"></span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon tone-danger"><app-icon name="receipt" [size]="20" /></span>
          <span class="stat-label">Gastos</span>
          @if (report(); as r) {
            <span class="stat-value">{{ formatCurrency(r.expensesTotal) }}</span>
          } @else {
            <span class="skeleton" style="height: 30px; width: 60%"></span>
          }
        </div>
        <div class="card stat">
          <span class="stat-icon" [class.tone-success]="(report()?.netProfit ?? 0) >= 0" [class.tone-danger]="(report()?.netProfit ?? 0) < 0">
            <app-icon name="trending-up" [size]="20" />
          </span>
          <span class="stat-label">Ganancia neta</span>
          @if (report(); as r) {
            <span class="stat-value" [style.color]="r.netProfit >= 0 ? 'var(--c-success)' : 'var(--c-danger)'">{{
              formatCurrency(r.netProfit)
            }}</span>
          } @else {
            <span class="skeleton" style="height: 30px; width: 60%"></span>
          }
        </div>
      </section>

      <section class="card card-pad">
        <div class="row-between" style="margin-bottom: 16px">
          <h2>Ingresos · últimos 6 meses</h2>
        </div>
        <div class="chart-box">
          <canvas baseChart [type]="'bar'" [data]="chartData()" [options]="chartOptions"></canvas>
        </div>
      </section>

      <div class="grid grid-2">
        <section class="card">
          <div class="card-head"><h2>Servicios más pedidos</h2></div>
          @if (report(); as r) {
            @if (r.topServices.length === 0) {
              <p class="section-empty">Sin sesiones completadas este mes.</p>
            } @else {
              <ul class="list">
                @for (s of r.topServices; track s.serviceId; let i = $index) {
                  <li class="list-row rank-row">
                    <span class="rank">{{ i + 1 }}</span>
                    <span class="grow">
                      <span class="row-between">
                        <span class="list-title truncate">{{ s.name }}</span>
                        <span class="subtle small">{{ plural(s.count, 'vez', 'veces') }}</span>
                      </span>
                      <span class="progress" style="margin-top: 8px; height: 6px">
                        <span [style.width.%]="(s.count / maxServiceCount()) * 100"></span>
                      </span>
                    </span>
                  </li>
                }
              </ul>
            }
          } @else {
            <div class="skeleton-row"><span class="skeleton grow" style="height: 16px"></span></div>
          }
        </section>

        <section class="card">
          <div class="card-head"><h2>Mejores clientas</h2></div>
          @if (report(); as r) {
            @if (r.topClients.length === 0) {
              <p class="section-empty">Sin pagos registrados este mes.</p>
            } @else {
              <ul class="list">
                @for (c of r.topClients; track c.clientId; let i = $index) {
                  <li>
                    <a class="list-row" [routerLink]="['/admin/clientas', c.clientId]">
                      <span class="medal" [class]="'medal medal-' + (i + 1)">{{ i + 1 }}</span>
                      <span class="avatar avatar-sm" [style.background]="avatar(c.name).bg" [style.color]="avatar(c.name).fg">{{
                        initials(c.name)
                      }}</span>
                      <span class="grow list-title truncate">{{ c.name }}</span>
                      <span class="strong num">{{ formatCurrency(c.total) }}</span>
                    </a>
                  </li>
                }
              </ul>
            }
          } @else {
            <div class="skeleton-row"><span class="skeleton grow" style="height: 16px"></span></div>
          }
        </section>
      </div>

      <a class="card card-pad card-link no-print" routerLink="/admin/gastos" [queryParams]="{ year: cursorYear(), month: cursorMonth() }">
        <div class="row">
          <span class="tile tone-danger"><app-icon name="receipt" [size]="20" /></span>
          <div class="grow">
            <h3>Gastos del mes</h3>
            <p class="muted small">Registra insumos, arriendo y otros gastos.</p>
          </div>
          <app-icon name="chevron-right" [size]="18" class="chev" />
        </div>
      </a>
    </div>
  `,
  styles: [
    `
      .chart-box {
        position: relative;
        height: 260px;
      }
      .section-empty {
        padding: 4px 20px 20px;
        color: var(--c-text-3);
        font-size: 14px;
      }
      .rank-row {
        align-items: flex-start;
      }
      .rank {
        width: 22px;
        font-weight: 800;
        color: var(--c-text-3);
        padding-top: 1px;
      }
      .rank-row .progress {
        display: block;
      }
      .medal {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 800;
        background: var(--c-surface-3);
        color: var(--c-text-2);
        flex-shrink: 0;
      }
      .medal-1 {
        background: #f8e7b0;
        color: #7a5a10;
      }
      .medal-2 {
        background: #e6e6ec;
        color: #55556a;
      }
      .medal-3 {
        background: #f3dcc7;
        color: #7c4a1e;
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly toast = inject(ToastService);

  report = signal<MonthReport | null>(null);
  chartData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  private cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  monthLabel = computed(() => formatMonthYear(this.cursor()));
  maxServiceCount = computed(() => Math.max(1, ...(this.report()?.topServices.map((s) => s.count) ?? [1])));

  readonly chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#241733',
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        titleFont: CHART_FONT,
        bodyFont: CHART_FONT,
        callbacks: { label: (ctx) => formatCurrency(Number(ctx.parsed.y ?? 0)) },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#7f7092', font: CHART_FONT } },
      y: {
        beginAtZero: true,
        grid: { color: '#eee7f4' },
        border: { display: false },
        ticks: { color: '#7f7092', font: CHART_FONT, maxTicksLimit: 5, callback: (v) => formatCompact(Number(v)) },
      },
    },
  };

  formatCurrency = formatCurrency;
  avatar = avatarColors;
  initials = initials;
  plural = plural;

  async ngOnInit() {
    await this.reload();
  }

  cursorYear(): number {
    return this.cursor().getFullYear();
  }

  cursorMonth(): number {
    return this.cursor().getMonth() + 1;
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.cursor().getFullYear() === now.getFullYear() && this.cursor().getMonth() === now.getMonth();
  }

  async shiftMonth(delta: number) {
    if (delta > 0 && this.isCurrentMonth()) return;
    const c = this.cursor();
    this.cursor.set(new Date(c.getFullYear(), c.getMonth() + delta, 1));
    await this.reload();
  }

  print() {
    window.print();
  }

  private async reload() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;
    this.report.set(null);

    try {
      const [report, monthly] = await Promise.all([
        this.reportsService.getMonthReport(ownerId, this.cursorYear(), this.cursorMonth()),
        this.reportsService.getLast6MonthsRevenue(ownerId),
      ]);
      this.report.set(report);
      const last = monthly.length - 1;
      this.chartData.set({
        labels: monthly.map((p) => p.label.replace('.', '')),
        datasets: [
          {
            data: monthly.map((p) => p.total),
            backgroundColor: monthly.map((_, i) => (i === last ? '#7b56a6' : '#dccbee')),
            hoverBackgroundColor: '#694793',
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 44,
          },
        ],
      });
    } catch {
      this.toast.error('No se pudo cargar el reporte.');
    }
  }
}
