import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";
import { ReactNative } from "@vendetta/metro/common";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const { FormIcon } = Forms;

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

                    const actionSheetContainer = findInReactTree(
                        res,
                        (x: any) => Array.isArray(x) && x[0]?.type?.name === "ActionSheetRowGroup"
                    );
                    const buttons = findInReactTree(
                        res,
                        (x: any) => x?.[0]?.type?.name === "ButtonRow"
                    );

                    if (buttons) {
                        if (buttons.some((b: any) => b?.props?.label === "Reverse Search Image")) return;
                        buttons.push(
                            <Forms.FormRow
                                label="Reverse Search Image"
                                leading={
                                    <FormIcon
                                        style={{ opacity: 1 }}
                                        source={getAssetIDByName("ic_search")}
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
                    } else if (actionSheetContainer && actionSheetContainer[1]) {
                        const middleGroup = actionSheetContainer[1];
                        const ActionSheetRow = middleGroup.props.children[0].type;
                        const existingIcon = middleGroup.props.children[0].props.icon;

                        if (middleGroup.props.children.some((b: any) => b?.props?.label === "Reverse Search Image")) return;

                        middleGroup.props.children.push(
                            <ActionSheetRow
                                label="Reverse Search Image"
                                icon={{
                                    $$typeof: existingIcon.$$typeof,
                                    type: existingIcon.type,
                                    key: null,
                                    ref: null,
                                    props: {
                                        IconComponent: () => (
                                            <FormIcon
                                                style={{ opacity: 1 }}
                                                source={getAssetIDByName("ic_search")}
                                            />
                                        ),
                                    },
                                }}
                                onPress={() => {
                                    LazyActionSheet.hideActionSheet();
                                    ReactNative.Linking.openURL(
                                        `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
                                    );
                                }}
                                key="reverse-search"
                            />
                        );
                    }
                });
            });
        }));
    },

    onUnload() {
        patches.forEach(p => p());
        patches = [];
    }
};