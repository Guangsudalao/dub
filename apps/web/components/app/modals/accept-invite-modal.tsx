import useProject from "#/lib/swr/use-project";
import { LoadingDots, Logo, Modal } from "@dub/ui";
import va from "@vercel/analytics";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function AcceptInviteModal({
  showAcceptInviteModal,
  setShowAcceptInviteModal,
}: {
  showAcceptInviteModal: boolean;
  setShowAcceptInviteModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const [accepting, setAccepting] = useState(false);
  const { error } = useProject();

  return (
    <Modal
      showModal={showAcceptInviteModal}
      setShowModal={setShowAcceptInviteModal}
      preventDefaultClose
    >
      {error?.status === 409 ? (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">Project Invitation</h3>
            <p className="text-center text-sm text-gray-500">
              You've been invited to join and collaborate on the{" "}
              <span className="font-mono text-purple-600">
                {slug || "......"}
              </span>{" "}
              project on Dub
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
            <button
              onClick={() => {
                setAccepting(true);
                fetch(`/api/projects/${slug}/invites/accept`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }).then(async () => {
                  va.track("User accepted project invite", {
                    project: slug,
                  });
                  await mutate(
                    (key) =>
                      typeof key === "string" &&
                      key.startsWith(`/api/projects`),
                    undefined,
                    { revalidate: true },
                  );
                  toast.success("You now are a part of this project!");
                });
              }}
              disabled={accepting}
              className={`${
                accepting
                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                  : "border-black bg-black text-white hover:bg-white hover:text-black"
              } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
            >
              {accepting ? <LoadingDots /> : <p>Accept invite</p>}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">Project Invitation Expired</h3>
            <p className="text-center text-sm text-gray-500">
              This invite has expired or is no longer valid.
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
            <Link
              href="/"
              className="flex h-10 w-full items-center justify-center rounded-md border border-black bg-black text-sm text-white transition-all hover:bg-white hover:text-black focus:outline-none"
            >
              Back to dashboard
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
}

export function useAcceptInviteModal() {
  const [showAcceptInviteModal, setShowAcceptInviteModal] = useState(false);

  const AcceptInviteModalCallback = useCallback(() => {
    return (
      <AcceptInviteModal
        showAcceptInviteModal={showAcceptInviteModal}
        setShowAcceptInviteModal={setShowAcceptInviteModal}
      />
    );
  }, [showAcceptInviteModal, setShowAcceptInviteModal]);

  return useMemo(
    () => ({
      setShowAcceptInviteModal,
      AcceptInviteModal: AcceptInviteModalCallback,
    }),
    [setShowAcceptInviteModal, AcceptInviteModalCallback],
  );
}
