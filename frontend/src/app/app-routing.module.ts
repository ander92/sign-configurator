import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './components/upload/upload.component';
import { SimulatorComponent } from './components/simulator/simulator.component';
const routes: Routes = [
  { path: '', component: UploadComponent },
  { path: 'simulator', component: SimulatorComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
