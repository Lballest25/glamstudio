import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthService } from '../../core/services/auth.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { MonthReport, ReportsService } from './reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="page-header">
      <h1>Reportes</h1>
    </div>

    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
      <button class="btn btn-sm" (click)="shiftMonth(-1)">&larr;</button>
      <strong>{{ monthLabel() }}</strong>
      <button class="btn btn-sm" [disabled]="isCurrentMonth()" (click)="shiftMonth(1)">&rarr;</button>
    </div>

    @if (report(); as report) {
      <section class="summary-cards">
        <div class="card">
          <span class="hint">Ingresos del mes</span>
          <div style="font-size:20px; font-weight:800; color: var(--color-success);">
            {{ formatCurrency(report.revenue) }}
          </div>
        </div>
        <div class="card">
          <span class="hint">Sesiones</span>
          <div style="font-size:20px; font-weight:800;">{{ report.sessionCount }}</div>
        </div>
        <div class="card">
          <span class="hint">Gastos del mes</span>
          <div style="font-size:20px; font-weight:800; color: var(--color-error);">
            {{ formatCurrency(report.expensesTotal) }}
          </div>
        </div>
        <div class="card">
          <span class="hint">Ganancia neta</span>
          <div
            style="font-size:20px; font-weight:800;"
            [style.color]="report.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)'"
          >
            {{ formatCurrency(report.netProfit) }}
          </div>
        </div>
      </section>

      <div class="card" style="margin-bottom:24px; max-width:640px;">
        <h3 style="margin-top:0;">Ingresos — últimos 6 meses</h3>
        <canvas baseChart [type]="'bar'" [data]="chartData()" [options]="chartOptions"></canvas>
      </div>

      <div style="display:flex; gap:24px; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          <h3>Top 5 servicios</h3>
          @if (report.topServices.length === 0) {
            <p class="hint">Sin datos este mes.</p>
          } @else {
            <ul class="list">
              @for (s of report.topServices; track s.serviceId) {
                <li class="list-item">
                  <span style="flex:1;">{{ s.name }}</span>
                  <span class="badge">{{ s.count }}</span>
                </li>
              }
            </ul>
          }
        </div>
        <div style="flex:1; min-width:260px;">
          <h3>Top 5 clientas</h3>
          @if (report.topClients.length === 0) {
            <p class="hint">Sin datos este mes.</p>
          } @else {
            <ul class="list">
              @for (c of report.topClients; track c.clientId) {
                <li class="list-item">
                  <span style="flex:1;">{{ c.name }}</span>
                  <span style="font-weight:700;">{{ formatCurrency(c.total) }}</span>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <a class="btn" style="margin-top:20px;" routerLink="/admin/gastos" [queryParams]="{ year: cursorYear(), month: cursorMonth() }">
        Ver detalle de gastos →
      </a>
    } @else if (loading()) {
      <p class="hint">Cargando…</p>
    }
  `,
  styles: [
    `
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  loading = signal(true);
  report = signal<MonthReport | null>(null);
  chartData = signal<ChartConfiguration<'bar'>['data']>({ labels: [], datasets: [] });
  private cursor = new Date();

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  formatCurrency = formatCurrency;

  constructor(private readonly auth: AuthService, private readonly reportsService: ReportsService) {}

  async ngOnInit() {
    await this.reload();
  }

  cursorYear(): number {
    return this.cursor.getFullYear();
  }

  cursorMonth(): number {
    return this.cursor.getMonth() + 1;
  }

  monthLabel(): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(this.cursor);
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.cursor.getFullYear() === now.getFullYear() && this.cursor.getMonth() === now.getMonth();
  }

  async shiftMonth(delta: number) {
    if (delta > 0 && this.isCurrentMonth()) return;
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + delta, 1);
    await this.reload();
  }

  private async reload() {
    const ownerId = this.auth.currentUser()?.id;
    if (!ownerId) return;
    this.loading.set(true);

    const [report, monthlyRevenue] = await Promise.all([
      this.reportsService.getMonthReport(ownerId, this.cursor.getFullYear(), this.cursor.getMonth() + 1),
      this.reportsService.getLast6MonthsRevenue(ownerId),
    ]);

    this.report.set(report);
    this.chartData.set({
      labels: monthlyRevenue.map((p) => p.label),
      datasets: [{ data: monthlyRevenue.map((p) => p.total), label: 'Ingresos', backgroundColor: '#9c7bb8' }],
    });
    this.loading.set(false);
  }
}
