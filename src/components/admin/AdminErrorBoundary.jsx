import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";

class AdminErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // evita tela branca no admin; loga para diagnóstico
    // eslint-disable-next-line no-console
    console.error("[AdminErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box sx={{ py: 2 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 950, fontSize: { xs: 18, md: 22 } }}>
              Ops — algo deu errado nesta tela do admin
            </Typography>
            <Typography sx={{ opacity: 0.78, fontWeight: 650 }}>
              Isso evita tela branca. Você pode voltar ao painel e continuar navegando.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<ArrowBackIosNewRoundedIcon />}
                onClick={this.props.onBack}
              >
                Voltar ao painel
              </Button>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </Stack>
            {this.state.error?.message ? (
              <Typography sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", opacity: 0.7 }}>
                {this.state.error.message}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Box>
    );
  }
}

export default function AdminErrorBoundary({ children }) {
  const navigate = useNavigate();
  return <AdminErrorBoundaryInner onBack={() => navigate("/admin")} children={children} />;
}

