import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { ReactNative } from "@vendetta/metro/common";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow;

let patches: (() => void)[] = [];

export default {
    onLoad() {
        patches.push(before("openLazy", LazyActionSheet, ([component, key, msg]) => {
            const message = msg?.message;
            if (key !== "MessageLongPressActionSheet" || !message) return;

            const imageUrl =
                message.attachments?.find((a: any) =>
                    a.content_type?.startsWith("image/")
                )?.url ??
                message.embeds?.find((e: any) => e.image?.url)?.image?.url ??
                message.embeds?.find((e: any) => e.thumbnail?.url)?.thumbnail?.url;

            if (!imageUrl) return;

            component.then((instance: any) => {
                const unpatch = after("default", instance, (_, res) => {
                    setTimeout(unpatch, 0);

                    const buttons = findInReactTree(res, (x: any) => x?.[0]?.type?.name === "ActionSheetRow");
                    if (!buttons) return;

                    if (buttons.some((b: any) => b?.props?.label === "Reverse Search Image")) return;

                    buttons.push(
                        <ActionSheetRow
                            label="Reverse Search Image"
                            icon={<ActionSheetRow.Icon source={getAssetIDByName("ic_search")} />}
                            onPress={() => {
                                LazyActionSheet.hideActionSheet();
                                ReactNative.Linking.openURL(
                                    `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
                                );
                            }}
                        />
                    );
                });
            });
        }));
    },

    onUnload() {
        patches.forEach(p => p());
        patches = [];
    }
};