import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EnvironmentsComponent } from './environments/environments.component';
import { FlowsComponent } from './flows/flows.component';
import { FlowDefinitionComponent } from './flow-definition/flow-definition.component';
import { AllFlowsComponent } from './all-flows/all-flows.component';
import { KeyVaultsComponent } from './key-vaults/key-vaults.component';
import { PerformanceMonitorModule } from './performance-monitor/performance-monitor.module';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    EnvironmentsComponent,
    FlowsComponent,
    FlowDefinitionComponent,
    AllFlowsComponent,
    KeyVaultsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    PerformanceMonitorModule.forRoot(environment.perfMonitor)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
