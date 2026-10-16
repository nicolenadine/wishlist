# Make a theme with AI

You don't need to know any code to make your own theme. Describe the look you want to an AI like Claude or ChatGPT, paste its answer into the **Theme Lab**, and watch a sample shop change to match. When it looks right, download it and add it to your wishlist.

<img src="media/theme-lab.webp" alt="The Theme Lab. On the left, a pasted AI answer and a checklist: theme.css, theme.json and 3 pictures found, the theme's colors, and 'Everything checked looks easy to read.' On the right, a sample wishlist shop in a bright birthday theme called Confetti." width="100%">

## 1. Open the Theme Lab

Open the lab on the demo site: **https://nicolenadine.github.io/wishlist/theme-lab.html**

Your own wishlist has one too, at your site's address followed by `theme-lab.html`. If yours isn't there yet, update your copy (**Sync fork → Update branch** on GitHub). Both work the same, and nothing you do in the lab changes anyone's site.

## 2. Give your AI the instructions

In the lab, click **Copy AI instructions**. Start a new chat in Claude, ChatGPT, Gemini or another AI, paste them in, and then say what you'd like. For example:

> A cozy cabin look for my Christmas list, with plaid and a little fox. My mom and aunts will be visiting, so make the text easy to read.

The AI may ask a couple of questions first. Answer them, or say "you pick."

**Using Claude?** You can add the instructions as a skill, so you don't have to paste them each time. In the lab, click **Or add them to Claude as a skill** to download `wishlist-theme-skill.zip`, then upload it in Claude under **Settings → Capabilities → Skills**. After that, just ask Claude to make you a wishlist theme. Skills need a paid Claude plan and code execution turned on; [Claude's guide to skills](https://support.claude.com/en/articles/12512180-using-skills-in-claude) has the details.

## 3. Paste the answer into the lab

Copy the AI's **whole** answer, chat text and all, and paste it into the lab's box. The lab finds the theme files and shows them on the sample shop.

Under **Check what was found**, you'll see:

- **Which files it found.** A green check means it's there. If something is missing or has a typo, the lab says what to ask the AI.
- **The theme's colors.**
- **Easy to read?** The lab checks the text all over the sample shop. If it says something is hard to read, tell the AI exactly that. For example: *"The lab says the View buttons and the welcome message are hard to read. Please fix them and send all the files again."*

Try the **Phone** button at the top too. Most people will open your list on a phone.

## 4. Ask for changes

Keep chatting with the AI until you love it: *"Make the header darker," "Call starred items Top Picks," "Make the fox look happier."* Each time, paste the AI's new answer into the lab, replacing the old one (click **Clear** first).

Always ask for **all the files** each time. The lab shows exactly what's pasted, so a half answer gives you half a theme.

Want someone's opinion first? Click **Copy a preview link** and send it to them. The link opens the lab with your theme in it.

## 5. Add it to your wishlist

1. Click **Download theme folder**. You get a zip file; open it to get a folder named after your theme, like `cozy-cabin`.
2. On GitHub, open your copy of the wishlist and go into the **themes** folder. Click **Add file → Upload files**, drag the whole folder in, and click **Commit changes**.
3. Still in the **themes** folder, open **themes.csv**, click the pencil, add the line the lab shows you (like `Cozy Cabin,cozy-cabin`) at the end, and click **Commit changes**.
4. In your sheet's **Settings** tab, type your theme's name into the **Theme** cell. It won't be in the dropdown, because the dropdown lists the themes everyone shares, but typing it works. (The cell may show a small red corner; that's fine.) Your site switches within about 5 minutes.

## Share it with everyone (optional)

Made something you're proud of? You can share it so it shows up in everyone's Theme dropdown. See [Share your theme with everyone](../themes/README.md#share-your-theme-with-everyone).

## Questions

<details>
<summary><b>The lab says a file is missing, or that theme.json has a typo.</b></summary>

Ask the AI to send all the files again, in full. If it keeps happening, paste the AI instructions again in a new chat. They tell the AI exactly how to lay out its answer.
</details>

<details>
<summary><b>The AI drew a character from a movie or game.</b></summary>

Ask it for an original character instead. Themes you share need to be all your own work, and the instructions already ask the AI not to copy other people's characters, logos or art.
</details>

<details>
<summary><b>Is it safe to paste an AI's answer into the lab?</b></summary>

Yes. Themes are only colors, fonts, words and pictures, with no code that runs. The lab removes anything code-like from pictures, and everything happens in your own browser. Nothing you paste is sent anywhere, and your site doesn't change until you upload the folder yourself.
</details>

<details>
<summary><b>I want to change one of the built-in themes instead.</b></summary>

In the lab, open **Change one of the built-in themes instead**, pick a theme, and click **Copy its files**. Paste them to your AI along with the instructions and what you'd like different. Give your version a new name so it doesn't replace the original.
</details>
