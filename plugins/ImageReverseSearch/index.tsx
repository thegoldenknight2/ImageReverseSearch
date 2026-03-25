import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { ReactNative, stylesheet } from "@vendetta/metro/common";
import { semanticColors } from "@vendetta/ui";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow;

const styles = stylesheet.createThemedStyleSheet({
    icon: {
        width: 24,
        height: 24,
        tintColor: semanticColors.INTERACTIVE_NORMAL
    }
});

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

                    const icon = getAssetIDByName("SearchIcon");

                    buttons.push(
                        <ActionSheetRow
                            label="Reverse Search Image"
                            icon={
                                <ActionSheetRow.Icon
                                    source={icon}
                                    IconComponent={() => (
                                        <ReactNative.Image
                                            resizeMode="cover"
                                            style={styles.icon}
                                            source={icon}
                                        />
                                    )}
                                />
                            }
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
