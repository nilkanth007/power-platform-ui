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

@NgModule({
  declarations: [
    AppComponent,
    EnvironmentsComponent,
    FlowsComponent,
    FlowDefinitionComponent,
    AllFlowsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
