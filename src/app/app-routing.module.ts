import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { EnvironmentsComponent } from './environments/environments.component';
import { FlowsComponent } from './flows/flows.component';
import { FlowDefinitionComponent } from './flow-definition/flow-definition.component';
import { AllFlowsComponent } from './all-flows/all-flows.component';
import { KeyVaultsComponent } from './key-vaults/key-vaults.component';

const routes: Routes = [
  { path: 'environments', component: EnvironmentsComponent },
  { path: 'all-flows', component: AllFlowsComponent },
  { path: 'keyvaults', component: KeyVaultsComponent },
  { path: 'flows/:envId', component: FlowsComponent },
  { path: 'flow-definition/:envId/:flowId', component: FlowDefinitionComponent },
  { path: '', redirectTo: '/environments', pathMatch: 'full' },
  { path: '**', redirectTo: '/environments' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
