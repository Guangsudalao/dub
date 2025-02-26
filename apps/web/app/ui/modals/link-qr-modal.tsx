"use client";

import { QRCodeSVG, getQRAsCanvas, getQRAsSVGDataUri } from "#/lib/qr";
import useProject from "#/lib/swr-app/use-project";
import { SimpleLinkProps } from "#/lib/types";
import { BlurImage } from "@/components/shared/blur-image";
import { Clipboard, Download } from "@/components/shared/icons";
import {
  IconMenu,
  Logo,
  Modal,
  Photo,
  Popover,
  Switch,
  Tooltip,
  TooltipContent,
} from "@dub/ui";
import { GOOGLE_FAVICON_URL, getApexDomain, linkConstructor } from "@dub/utils";
import { Check, ChevronRight } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

function LinkQRModalHelper({
  showLinkQRModal,
  setShowLinkQRModal,
  props,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  props: SimpleLinkProps;
}) {
  return (
    <Modal showModal={showLinkQRModal} setShowModal={setShowLinkQRModal}>
      <QRCodePicker props={props} />
    </Modal>
  );
}

export function QRCodePicker({ props }: { props: SimpleLinkProps }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const { logo } = useProject();
  const { avatarUrl, apexDomain } = useMemo(() => {
    try {
      const apexDomain = getApexDomain(props.url);
      return {
        avatarUrl: `${GOOGLE_FAVICON_URL}${apexDomain}`,
        apexDomain,
      };
    } catch (e) {
      return {
        avatarUrl: null,
        apexDomain: null,
      };
    }
  }, [props]);

  const qrLogoUrl = useMemo(() => {
    if (logo) return logo;
    return typeof window !== "undefined" && window.location.origin
      ? new URL("/_static/logo.svg", window.location.origin).href
      : "https://dub.sh/_static/logo.svg";
  }, [logo]);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
  }

  const [showLogo, setShowLogo] = useState(true);
  const [fgColor, setFgColor] = useState("#000000");

  const qrData = useMemo(
    () => ({
      value: linkConstructor({
        key: props.key,
        domain: props.domain,
      }),
      bgColor: "#ffffff",
      fgColor,
      size: 1024,
      level: "Q", // QR Code error correction level: https://blog.qrstuff.com/general/qr-code-error-correction
      ...(showLogo && {
        imageSettings: {
          src: qrLogoUrl,
          height: 256,
          width: 256,
          excavate: true,
        },
      }),
    }),
    [props, fgColor, showLogo, qrLogoUrl],
  );

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    try {
      const canvas = await getQRAsCanvas(qrData, "image/png", true);
      (canvas as HTMLCanvasElement).toBlob(async function (blob) {
        // @ts-ignore
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {
      throw e;
    }
  };
  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {avatarUrl ? (
          <BlurImage
            src={avatarUrl}
            alt={apexDomain}
            className="h-10 w-10 rounded-full"
            width={40}
            height={40}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Download QR Code</h3>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 py-6 text-left sm:rounded-b-2xl">
        <div className="mx-auto rounded-lg border-2 border-gray-200 bg-white p-4">
          <QRCodeSVG
            value={qrData.value}
            size={qrData.size / 8}
            bgColor={qrData.bgColor}
            fgColor={qrData.fgColor}
            level={qrData.level}
            includeMargin={false}
            // @ts-ignore
            imageSettings={
              showLogo && {
                ...qrData.imageSettings,
                height: qrData.imageSettings
                  ? qrData.imageSettings.height / 8
                  : 0,
                width: qrData.imageSettings
                  ? qrData.imageSettings.width / 8
                  : 0,
              }
            }
          />
        </div>

        <AdvancedSettings
          qrData={qrData}
          setFgColor={setFgColor}
          showLogo={showLogo}
          setShowLogo={setShowLogo}
        />

        <div className="grid grid-cols-2 gap-2 px-4 sm:px-16">
          <button
            onClick={async () => {
              toast.promise(copyToClipboard, {
                loading: "Copying QR code to clipboard...",
                success: "Copied QR code to clipboard!",
                error: "Failed to copy",
              });
            }}
            className="flex items-center justify-center gap-2 rounded-md border border-black bg-black px-5 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> <p>Copied</p>
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" /> <p>Copy</p>
              </>
            )}
          </button>
          <QrDropdown
            download={download}
            qrData={qrData}
            showLogo={showLogo}
            logo={qrLogoUrl}
          />
        </div>

        {/* This will be used to prompt downloads. */}
        <a
          className="hidden"
          download={`${props.key}-qrcode.svg`}
          ref={anchorRef}
        />
      </div>
    </>
  );
}

function AdvancedSettings({ qrData, setFgColor, showLogo, setShowLogo }) {
  const { plan } = useProject();
  const [expanded, setExpanded] = useState(false);
  const debouncedSetFgColor = useDebouncedCallback((color) => {
    setFgColor(color);
  }, 100);

  return (
    <div>
      <div className="px-4 sm:px-16">
        <button
          type="button"
          className="flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-5 w-5 text-gray-600 ${
              expanded ? "rotate-90" : ""
            } transition-all`}
          />
          <p className="text-sm text-gray-600">Advanced options</p>
        </button>
      </div>
      {expanded && (
        <div className="mt-4 grid gap-5 border-b border-t border-gray-200 bg-white px-4 py-8 sm:px-16">
          <div>
            <label
              htmlFor="logo-toggle"
              className="block text-sm font-medium text-gray-700"
            >
              Logo
            </label>
            {plan && plan !== "free" ? (
              <div className="mt-1 flex items-center space-x-2">
                <Switch
                  fn={setShowLogo}
                  checked={showLogo}
                  trackDimensions="h-6 w-12"
                  thumbDimensions="w-5 h-5"
                  thumbTranslate="translate-x-6"
                />
                <p className="text-sm text-gray-600">Show dub.co Logo</p>
              </div>
            ) : (
              <Tooltip
                content={
                  <TooltipContent
                    title="You need to be on the Pro plan to customize your QR Code logo."
                    cta="Upgrade to Pro"
                    href="/pricing"
                  />
                }
              >
                <div className="pointer-events-none mt-1 flex cursor-not-allowed items-center space-x-2 sm:pointer-events-auto">
                  <Switch
                    fn={setShowLogo}
                    checked={showLogo}
                    trackDimensions="h-6 w-12"
                    thumbDimensions="w-5 h-5"
                    thumbTranslate="translate-x-6"
                    disabled={true}
                  />
                  <p className="text-sm text-gray-600">Show dub.co Logo</p>
                </div>
              </Tooltip>
            )}
          </div>
          <div>
            <label
              htmlFor="color"
              className="block text-sm font-medium text-gray-700"
            >
              Foreground Color
            </label>
            <div className="relative mt-1 flex h-9 w-48 rounded-md shadow-sm">
              <Tooltip
                content={
                  <div className="flex max-w-xs flex-col items-center space-y-3 p-5 text-center">
                    <HexColorPicker
                      color={qrData.fgColor}
                      onChange={debouncedSetFgColor}
                    />
                  </div>
                }
              >
                <div
                  className="h-full w-12 rounded-l-md border"
                  style={{
                    backgroundColor: qrData.fgColor,
                    borderColor: qrData.fgColor,
                  }}
                />
              </Tooltip>
              <HexColorInput
                id="color"
                name="color"
                color={qrData.fgColor}
                onChange={(color) => setFgColor(color)}
                prefixed
                style={{ borderColor: qrData.fgColor }}
                className="block w-full rounded-r-md border-2 border-l-0 pl-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-black sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QrDropdown({ download, qrData, showLogo, logo }) {
  const [openPopover, setOpenPopover] = useState(false);
  return (
    <Popover
      content={
        <div className="grid w-full gap-1 p-2 sm:w-40">
          <button
            onClick={() => {
              download(
                getQRAsSVGDataUri({
                  ...qrData,
                  ...(showLogo && {
                    imageSettings: {
                      ...qrData.imageSettings,
                      src: logo || "https://dub.co/_static/logo.svg",
                    },
                  }),
                }),
                "svg",
              );
            }}
            className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
          >
            <IconMenu text="SVG" icon={<Photo className="h-4 w-4" />} />
          </button>
          <button
            onClick={async () => {
              download(await getQRAsCanvas(qrData, "image/png"), "png");
            }}
            className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
          >
            <IconMenu text="PNG" icon={<Photo className="h-4 w-4" />} />
          </button>
          <button
            onClick={async () => {
              download(await getQRAsCanvas(qrData, "image/jpeg"), "jpg");
            }}
            className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
          >
            <IconMenu text="JPEG" icon={<Photo className="h-4 w-4" />} />
          </button>
        </div>
      }
      align="center"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-black bg-black px-5 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        <Download />
        Export
      </button>
    </Popover>
  );
}

export function useLinkQRModal({ props }: { props: SimpleLinkProps }) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModal = useCallback(() => {
    return (
      <LinkQRModalHelper
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        props={props}
      />
    );
  }, [showLinkQRModal, setShowLinkQRModal, props]);

  return useMemo(
    () => ({ showLinkQRModal, setShowLinkQRModal, LinkQRModal }),
    [showLinkQRModal, setShowLinkQRModal, LinkQRModal],
  );
}
