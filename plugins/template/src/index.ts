import { before, after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { React } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { ReactNative } from "@vendetta/metro/common";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const { FormRow, FormIcon } = Forms;

const unpatch = before("openLazy", LazyActionSheet, ([component, key, msg]) => {
    const message = msg?.message;
    if (key !== "MessageLongPressActionSheet" || !message) return;

    // Check if message has any image attachments or embeds
    const imageUrl =
        message.attachments?.find((a: any) =>
            a.content_type?.startsWith("image/")
        )?.url ??
        message.embeds?.find((e: any) => e.image?.url || e.thumbnail?.url)
            ?.image?.url ??
        message.embeds?.find((e: any) => e.thumbnail?.url)?.thumbnail?.url;

    if (!imageUrl) return;

    component.then((instance: any) => {
        const unpatch = after("default", instance, (_, component) => {
            React.useEffect(() => () => { unpatch(); }, []);

            const buttons = findInReactTree(component, (x: any) => x?.[0]?.type?.name === "ButtonRow");
            if (!buttons) return;

            buttons.push(
                <FormRow
                    label="Reverse Search Image"
                    leading={<FormIcon style={{ opacity: 1 }} source={getAssetIDByName("ic_search")} />}
                    onPress={() => {
                        LazyActionSheet.hideActionSheet();
                        // Open Google Lens with the image URL
                        ReactNative.Linking.openURL(
                            `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
                        );
                    }}
                />
            );
        });
    });
});

export const onUnload = () => unpatch();
