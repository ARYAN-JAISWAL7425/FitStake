import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { DemoNav } from './components/DemoNav';
import { Onboarding } from './screens/Onboarding';
import { Login } from './screens/Login';
import { Register } from './screens/Register';
import { ForgotPassword } from './screens/ForgotPassword';
import { ResetPassword } from './screens/ResetPassword';
import { GoalSetup } from './screens/GoalSetup';
import { StakeSelect } from './screens/StakeSelect';
import { Home } from './screens/Home';
import { Goals } from './screens/Goals';
import { Wallet } from './screens/Wallet';
import { Rewards } from './screens/Rewards';
import { Profile } from './screens/Profile';
import { PlanReview } from './screens/PlanReview';
import { CycleComplete } from './screens/CycleComplete';
import { Missed } from './screens/Missed';
import { Group } from './screens/Group';
import { routes } from './lib/routes';

export default function App() {
  return (
    <BrowserRouter>
      <PhoneFrame>
        <Routes>
          <Route path={routes.onboarding} element={<Onboarding />} />
          <Route path={routes.login} element={<Login />} />
          <Route path={routes.register} element={<Register />} />
          <Route path={routes.forgotPassword} element={<ForgotPassword />} />
          <Route path={routes.resetPassword} element={<ResetPassword />} />
          <Route path={routes.goalSetup} element={<GoalSetup />} />
          <Route path={routes.stakeSelect} element={<StakeSelect />} />
          <Route path={routes.home} element={<Home />} />
          <Route path={routes.goals} element={<Goals />} />
          <Route path={routes.wallet} element={<Wallet />} />
          <Route path={routes.rewards} element={<Rewards />} />
          <Route path={routes.profile} element={<Profile />} />
          <Route path={routes.planReview} element={<PlanReview />} />
          <Route path={routes.cycleComplete} element={<CycleComplete />} />
          <Route path={routes.missed} element={<Missed />} />
          <Route path={routes.group} element={<Group />} />
        </Routes>
        <DemoNav />
      </PhoneFrame>
    </BrowserRouter>
  );
}
