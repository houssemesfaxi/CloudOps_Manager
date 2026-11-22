import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata = { title: "Mon profil · CloudOps Manager" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Vos informations et votre mot de passe."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </>
  );
}
