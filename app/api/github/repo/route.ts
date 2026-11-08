import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { action, token, owner, repo, branch, path, content, message } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "GitHub token required" }, { status: 401 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "cloudflare-ai-web",
    };

    switch (action) {
      case "list_user_repos": {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
          headers,
        });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "list_branches": {
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
          headers,
        });
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "get_tree": {
        if (!owner || !repo) return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
        const targetBranch = branch || "main";
        // Get branch commit sha
        const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${targetBranch}`, {
          headers,
        });
        if (!branchRes.ok) {
          return NextResponse.json({ error: "Failed to fetch branch" }, { status: branchRes.status });
        }
        const branchData = await branchRes.json();
        const treeSha = branchData.commit.commit.tree.sha;

        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
          { headers }
        );
        const treeData = await treeRes.json();
        return NextResponse.json(treeData);
      }

      case "read_file": {
        if (!owner || !repo || !path) {
          return NextResponse.json({ error: "owner, repo, and path required" }, { status: 400 });
        }
        const targetBranch = branch ? `?ref=${branch}` : "";
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}${targetBranch}`,
          { headers }
        );
        const data = await res.json();
        return NextResponse.json(data);
      }

      case "push_file": {
        if (!owner || !repo || !path || content === undefined) {
          return NextResponse.json({ error: "owner, repo, path, and content required" }, { status: 400 });
        }

        // Check if file exists to get current sha
        const checkRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || "main"}`,
          { headers }
        );
        let sha: string | undefined ;
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          sha = checkData.sha;
        }

        const encodedContent = Buffer.from(content).toString("base64");
        const putRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              message: message || `Update ${path} via Cloudflare AI Web`,
              content: encodedContent,
              branch: branch || "main",
              ...(sha ? { sha } : {}),
            }),
          }
        );

        const putData = await putRes.json();
        return NextResponse.json(putData, { status: putRes.status });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
